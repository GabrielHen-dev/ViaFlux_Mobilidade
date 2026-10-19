import type { ContextoSimulado, RotaSimulada } from "@/services/api/simulacao/roteador";
import type {
  DadosAberturaChamado, DadosAtualizacao, DadosOverride, DadosReclassificacao, DadosStatus, DadosTransferencia, FiltrosChamados,
} from "@/services/api/contratos";
import {
  CODIGOS_PRIORIDADE, MOTIVOS_AGUARDANDO, PESOS, STATUS_CHAMADO, TIPOS_CHAMADO,
  type Anexo, type ChamadoResumo, type CodigoPrioridade, type Localizacao, type ResumoChamados, type Status, type TipoChamado,
} from "@/types/chamado";
import { NOME_TIPO, ROTULO_PESO, ROTULO_PRIORIDADE } from "@/utils/prioridade";
import { gerarId } from "@/utils/id";
import { motivoDeRejeicao } from "@/utils/anexos";
import { PERFIS_DA_CENTRAL, PERFIS_DE_TRIAGEM, temAlgumPerfil } from "@/utils/perfis";
import { json, recusar, semConteudo } from "@/services/api/simulacao/resposta";
import { alterarEstado, carregarEstado, extrasDo, type EstadoSimulado } from "@/services/api/simulacao/estado";
import { contextoPorId, motivoPorId } from "@/services/api/simulacao/matriz";
import { guardarArquivo, lerArquivo } from "@/services/api/simulacao/arquivos";
import {
  AUTOR_SISTEMA, type ChamadoReal, classificacaoVigente, classificar, listarTodosOsReais, montarChamado, montarResumo,
  notificarSolicitante, novoEvento, ordenarPelaFila, ordenarPorMaisRecentes, prioridadeEfetiva, rotear,
} from "@/services/api/simulacao/montagem";

const MOTIVO_AGUARDANDO_ROTULO = { CLIENTE: "Cliente", FORNECEDOR: "Fornecedor", OUTRO_DEPARTAMENTO: "Outro departamento" } as const;
const TAMANHO_MINIMO_JUSTIFICATIVA = 10;
const VALOR_PADRAO_SEM_VEICULO = "Não se aplica";

function exigirAutenticacao(contexto: ContextoSimulado) {
  if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
  return contexto.usuario;
}

function exigirPerfil(contexto: ContextoSimulado, perfis: readonly string[]) {
  const usuario = exigirAutenticacao(contexto);
  if (!temAlgumPerfil(usuario.perfis, perfis)) recusar(403, "Você não tem permissão para acessar este recurso.");
  return usuario;
}

function textoObrigatorio(valor: unknown, campo: string, mensagem: string, minimo = 1) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (texto.length < minimo) recusar(400, "Um ou mais campos são inválidos.", { [campo]: mensagem });
  return texto;
}

function caminhoReal(codigo: string) {
  return `/api/chamados/${encodeURIComponent(codigo)}`;
}

async function buscarReal(contexto: ContextoSimulado, codigo: string) {
  const extras = carregarEstado().chamados[codigo];
  if (extras?.excluido || extras?.removido) recusar(404, `O chamado ${codigo} não foi encontrado.`);
  return contexto.realJson<ChamadoReal>(caminhoReal(codigo));
}

async function responderComChamado(contexto: ContextoSimulado, codigo: string, status = 200) {
  const real = await buscarReal(contexto, codigo);
  const corpo = alterarEstado((estado) => montarChamado(estado, real, new Date(), contexto.visaoDeCliente));
  return json(corpo, status);
}

function localizacaoValida(valor: Localizacao | null | undefined): Localizacao | null {
  if (!valor) return null;
  const endereco = (valor.endereco ?? "").trim();
  const temCoordenadas = typeof valor.latitude === "number" && typeof valor.longitude === "number";
  if (!endereco && !temCoordenadas) return null;
  return {
    endereco: endereco || `${valor.latitude?.toFixed(5)}, ${valor.longitude?.toFixed(5)}`,
    latitude: temCoordenadas ? valor.latitude : null,
    longitude: temCoordenadas ? valor.longitude : null,
  };
}

async function abrir(contexto: ContextoSimulado) {
  const usuario = exigirAutenticacao(contexto);
  const chave = contexto.headers.get("Idempotency-Key");
  const jaRegistrado = chave ? carregarEstado().chavesIdempotencia[`chamado:${chave}`] : undefined;
  if (jaRegistrado) return responderComChamado(contexto, jaRegistrado, 200);

  const dados = contexto.corpo<DadosAberturaChamado>();
  const motivo = motivoPorId(dados.motivoId);
  const contextoSituacional = contextoPorId(dados.contextoId);
  const erros: Record<string, string> = {};
  if (!motivo) erros.motivoId = "Selecione o motivo da solicitação.";
  if (!contextoSituacional) erros.contextoId = "Selecione o contexto situacional.";
  else if (motivo && contextoSituacional.tipo !== motivo.tipo) erros.contextoId = "O contexto não corresponde ao tipo do motivo.";
  if (!dados.descricao?.trim()) erros.descricao = "Descreva o problema.";
  if (!dados.cliente?.trim()) erros.cliente = "Informe o nome do solicitante.";
  if (!motivo || !contextoSituacional || Object.keys(erros).length > 0) recusar(400, "Um ou mais campos são inválidos.", erros);

  const localizacao = localizacaoValida(dados.localizacao);
  const resposta = await contexto.real("/api/chamados", {
    method: "POST",
    body: JSON.stringify({
      cliente: dados.cliente.trim(),
      telefone: dados.telefone ?? "",
      modelo: dados.modelo?.trim() || VALOR_PADRAO_SEM_VEICULO,
      placa: dados.placa ?? "",
      tipo: NOME_TIPO[motivo.tipo],
      descricao: dados.descricao.trim(),
      localizacao: localizacao?.endereco ?? "",
      solicitanteId: dados.solicitanteId,
    }),
  });
  if (!resposta.ok) return resposta;
  const criado = (await resposta.json()) as ChamadoReal;
  const abertura = new Date(criado.abertura);

  const corpo = alterarEstado((estado) => {
    const extras = extrasDo(estado, criado.id);
    const classificacao = classificar(motivo.tipo, motivo.severidade, contextoSituacional.urgencia);
    const departamento = rotear(classificacao, abertura);
    Object.assign(extras, {
      motivoId: motivo.id,
      contextoId: contextoSituacional.id,
      classificacao,
      departamento,
      localizacao,
      solicitanteId: dados.solicitanteId ?? usuario.id,
    });
    extras.eventos.push(
      novoEvento(
        "CLASSIFICACAO",
        "Classificação automática",
        `${NOME_TIPO[classificacao.tipo]} · severidade ${ROTULO_PESO[classificacao.severidade]} (${classificacao.severidade}) + urgência ${ROTULO_PESO[classificacao.urgencia]} (${classificacao.urgencia}) = score ${classificacao.score} · ${classificacao.prioridade} ${ROTULO_PRIORIDADE[classificacao.prioridade]}`,
        AUTOR_SISTEMA, false, abertura,
      ),
      novoEvento(
        "ROTEAMENTO",
        "Encaminhamento automático",
        departamento === classificacao.tipo
          ? `Chamado direcionado para ${NOME_TIPO[departamento]}.`
          : `P1 fora do horário comercial: chamado direcionado ao Plantão da ${NOME_TIPO[departamento]}.`,
        AUTOR_SISTEMA, true, abertura,
      ),
    );
    if (chave) estado.chavesIdempotencia[`chamado:${chave}`] = criado.id;
    return montarChamado(estado, criado, new Date(), contexto.visaoDeCliente);
  });
  return json(corpo, 201);
}

function aplicarFiltros(chamados: ChamadoResumo[], filtros: FiltrosChamados) {
  return chamados.filter((chamado) => {
    if (filtros.status && chamado.status !== filtros.status) return false;
    if (filtros.prioridade && chamado.prioridade !== filtros.prioridade) return false;
    if (filtros.departamento && chamado.departamento?.codigo !== filtros.departamento) return false;
    if (filtros.sla) {
      const situacoes = [chamado.sla?.primeiraResposta.situacao, chamado.sla?.resolucao.situacao];
      if (filtros.sla === "NO_PRAZO" ? situacoes.some((s) => s === "EM_RISCO" || s === "VIOLADO") : !situacoes.includes(filtros.sla)) return false;
    }
    return true;
  });
}

function lerFiltros(consulta: URLSearchParams): FiltrosChamados {
  const valor = <T extends string>(nome: string, permitidos: readonly T[]) => {
    const bruto = consulta.get(nome);
    if (!bruto) return undefined;
    if (!(permitidos as readonly string[]).includes(bruto)) recusar(400, `O filtro ${nome} informado não é válido.`);
    return bruto as T;
  };
  return {
    busca: consulta.get("busca") ?? undefined,
    status: valor("status", STATUS_CHAMADO),
    prioridade: valor("prioridade", CODIGOS_PRIORIDADE),
    departamento: valor("departamento", TIPOS_CHAMADO),
    sla: valor("sla", ["NO_PRAZO", "EM_RISCO", "VIOLADO"] as const),
    ordenacao: valor("ordenacao", ["fila", "recentes"] as const) ?? "fila",
    page: Number(consulta.get("page") ?? 0),
    size: Math.min(100, Number(consulta.get("size") ?? 20)),
  };
}

async function resumosVisiveis(contexto: ContextoSimulado, busca: string | null) {
  const reais = await listarTodosOsReais(contexto.realJson, busca);
  const agora = new Date();
  return alterarEstado((estado) =>
    reais
      .filter((item) => !estado.chamados[item.id]?.excluido && !estado.chamados[item.id]?.removido)
      .map((item) => montarResumo(estado, item, agora)),
  );
}

async function listar(contexto: ContextoSimulado) {
  const filtros = lerFiltros(contexto.consulta);
  const filtrados = aplicarFiltros(await resumosVisiveis(contexto, filtros.busca ?? null), filtros)
    .sort(filtros.ordenacao === "recentes" ? ordenarPorMaisRecentes : ordenarPelaFila);
  const page = filtros.page ?? 0;
  const size = filtros.size ?? 20;
  return json({
    content: filtrados.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: filtrados.length,
    totalPages: Math.ceil(filtrados.length / size),
  });
}

function contarPor<T extends string>(chaves: readonly T[], valores: T[]) {
  const contagem = Object.fromEntries(chaves.map((chave) => [chave, 0])) as Record<T, number>;
  for (const valor of valores) contagem[valor] += 1;
  return contagem;
}

function contadoresDeSla(chamados: ChamadoResumo[], prazo: "primeiraResposta" | "resolucao") {
  const situacoes = chamados.map((chamado) => chamado.sla?.[prazo].situacao).filter((situacao) => situacao !== undefined);
  return {
    noPrazo: situacoes.filter((s) => s === "NO_PRAZO" || s === "CUMPRIDO").length,
    emRisco: situacoes.filter((s) => s === "EM_RISCO").length,
    violado: situacoes.filter((s) => s === "VIOLADO" || s === "CUMPRIDO_COM_ATRASO").length,
  };
}

async function resumir(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  const filtros = lerFiltros(contexto.consulta);
  const chamados = aplicarFiltros(await resumosVisiveis(contexto, filtros.busca ?? null), { ...filtros, status: undefined });
  const ativos = chamados.filter((chamado) => chamado.status !== "Fechado");
  const corpo: ResumoChamados = {
    total: chamados.length,
    porStatus: contarPor(STATUS_CHAMADO, chamados.map((chamado) => chamado.status)),
    porPrioridade: contarPor(CODIGOS_PRIORIDADE, chamados.map((chamado) => chamado.prioridade)),
    porDepartamento: contarPor(TIPOS_CHAMADO, chamados.flatMap((chamado) => (chamado.departamento ? [chamado.departamento.codigo] : []))),
    sla: { primeiraResposta: contadoresDeSla(ativos, "primeiraResposta"), resolucao: contadoresDeSla(ativos, "resolucao") },
    p1SemPrimeiraResposta: ativos
      .filter((chamado) => chamado.prioridade === "P1" && chamado.sla?.primeiraResposta.cumpridoEm === null)
      .map((chamado) => chamado.id),
  };
  return json(corpo);
}

async function consultar(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  return responderComChamado(contexto, contexto.parametros.codigo);
}

function fecharPausaAberta(estado: EstadoSimulado, codigo: string, agora: Date) {
  const pausaAberta = extrasDo(estado, codigo).pausas.find((pausa) => pausa.fim === null);
  if (pausaAberta) pausaAberta.fim = agora.toISOString();
}

async function alterarStatus(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosStatus>();
  if (!STATUS_CHAMADO.includes(dados.status)) recusar(400, "Um ou mais campos são inválidos.", { status: "Status inválido." });
  if (dados.status === "Aguardando" && !MOTIVOS_AGUARDANDO.includes(dados.motivoAguardando as never)) {
    recusar(400, "Um ou mais campos são inválidos.", { motivoAguardando: "Informe quem está sendo aguardado: cliente, fornecedor ou outro departamento." });
  }
  const real = await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    const anterior: Status = extras.status ?? real.status;
    const mesmoMotivo = dados.status !== "Aguardando" || dados.motivoAguardando === extras.motivoAguardando;
    if (anterior === dados.status && mesmoMotivo) recusar(409, `O chamado já está ${dados.status}.`);
    if (dados.status === "Fechado" && anterior !== "Resolvido") recusar(409, "Só é possível fechar um chamado depois de resolvido.");

    fecharPausaAberta(estado, codigo, agora);
    extras.status = dados.status;
    extras.motivoAguardando = dados.status === "Aguardando" ? dados.motivoAguardando ?? null : null;
    if (dados.status === "Aguardando" && dados.motivoAguardando === "CLIENTE") extras.pausas.push({ inicio: agora.toISOString(), fim: null });
    if (dados.status === "Em atendimento" && !extras.primeiraRespostaEm) extras.primeiraRespostaEm = agora.toISOString();
    if (dados.status === "Resolvido") extras.resolvidoEm = agora.toISOString();
    else if (dados.status !== "Fechado") extras.resolvidoEm = null;

    const motivoAguardando = extras.motivoAguardando ? ` · aguardando ${MOTIVO_AGUARDANDO_ROTULO[extras.motivoAguardando].toLowerCase()}` : "";
    const pausa = extras.motivoAguardando === "CLIENTE" ? " · relógio de resolução pausado" : "";
    const observacao = dados.observacao?.trim() ? ` · ${dados.observacao.trim()}` : "";
    extras.eventos.push(novoEvento("STATUS", `Status alterado para ${dados.status}`, `${anterior} → ${dados.status}${motivoAguardando}${pausa}${observacao}`, autor, true, agora));
    notificarSolicitante(estado, codigo, dados.status, `O chamado ${codigo} mudou para ${dados.status}.`, agora);
  });
  return responderComChamado(contexto, codigo);
}

async function transferir(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosTransferencia>();
  if (!TIPOS_CHAMADO.includes(dados.departamento)) recusar(400, "Um ou mais campos são inválidos.", { departamento: "Selecione um departamento de destino válido." });
  const motivo = textoObrigatorio(dados.motivo, "motivo", "Informe o motivo da transferência.", TAMANHO_MINIMO_JUSTIFICATIVA);
  const real = await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    const origem = extras.departamento ?? classificacaoVigente(real, extras).tipo;
    if (origem === dados.departamento) recusar(409, "O chamado já está neste departamento.");
    extras.departamento = dados.departamento;
    extras.eventos.push(novoEvento("TRANSFERENCIA", "Chamado transferido", `${NOME_TIPO[origem]} → ${NOME_TIPO[dados.departamento]} · Motivo: ${motivo}`, autor, false, agora));
  });
  return responderComChamado(contexto, codigo);
}

async function reclassificar(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DE_TRIAGEM);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosReclassificacao>();
  const erros: Record<string, string> = {};
  if (!TIPOS_CHAMADO.includes(dados.tipo)) erros.tipo = "Tipo inválido.";
  if (!PESOS.includes(dados.severidade)) erros.severidade = "Severidade deve ser 1, 3 ou 5.";
  if (!PESOS.includes(dados.urgencia)) erros.urgencia = "Urgência deve ser 1, 3 ou 5.";
  if (Object.keys(erros).length > 0) recusar(400, "Um ou mais campos são inválidos.", erros);
  const justificativa = textoObrigatorio(dados.justificativa, "justificativa", "A reclassificação exige justificativa.", TAMANHO_MINIMO_JUSTIFICATIVA);
  const real = await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    const anterior = classificacaoVigente(real, extras);
    const nova = classificar(dados.tipo, dados.severidade, dados.urgencia);
    if (anterior.tipo === nova.tipo && anterior.severidade === nova.severidade && anterior.urgencia === nova.urgencia) {
      recusar(409, "A classificação informada é igual à vigente.");
    }
    extras.classificacao = nova;
    extras.eventos.push(novoEvento(
      "RECLASSIFICACAO",
      "Chamado reclassificado",
      `${NOME_TIPO[anterior.tipo]} ${anterior.severidade}+${anterior.urgencia} = ${anterior.score} (${anterior.prioridade}) → ${NOME_TIPO[nova.tipo]} ${nova.severidade}+${nova.urgencia} = ${nova.score} (${nova.prioridade}) · ${justificativa}`,
      autor, false, agora,
    ));
    if (anterior.tipo !== nova.tipo) {
      const departamento = rotear(nova, agora);
      extras.departamento = departamento;
      extras.eventos.push(novoEvento("ROTEAMENTO", "Encaminhamento reavaliado", `Novo tipo ${NOME_TIPO[nova.tipo]}: chamado direcionado para ${NOME_TIPO[departamento]}.`, AUTOR_SISTEMA, true, agora));
    }
  });
  return responderComChamado(contexto, codigo);
}

async function definirOverride(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DE_TRIAGEM);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosOverride>();
  if (!CODIGOS_PRIORIDADE.includes(dados.prioridade)) recusar(400, "Um ou mais campos são inválidos.", { prioridade: "Prioridade inválida." });
  const justificativa = textoObrigatorio(dados.justificativa, "justificativa", "O override de prioridade exige justificativa.", TAMANHO_MINIMO_JUSTIFICATIVA);
  const real = await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    const anterior: CodigoPrioridade = prioridadeEfetiva(classificacaoVigente(real, extras), extras.override);
    if (anterior === dados.prioridade) recusar(409, "A prioridade efetiva já é essa.");
    extras.override = { prioridade: dados.prioridade, justificativa, autor, definidoEm: agora.toISOString() };
    extras.eventos.push(novoEvento("OVERRIDE", "Prioridade alterada manualmente", `${anterior} → ${dados.prioridade} · ${justificativa}`, autor, false, agora));
  });
  return responderComChamado(contexto, codigo);
}

async function removerOverride(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DE_TRIAGEM);
  const codigo = contexto.parametros.codigo;
  const real = await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    if (!extras.override) recusar(409, "O chamado não tem override de prioridade.");
    const calculada = classificacaoVigente(real, extras).prioridade;
    extras.eventos.push(novoEvento("OVERRIDE", "Override removido", `${extras.override.prioridade} → ${calculada} (prioridade calculada)`, autor, false, agora));
    extras.override = null;
  });
  return responderComChamado(contexto, codigo);
}

async function registrarAtualizacao(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  const codigo = contexto.parametros.codigo;
  const dados = contexto.corpo<DadosAtualizacao>();
  const texto = textoObrigatorio(dados.texto, "texto", "Escreva a atualização.");
  await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  const visivelCliente = contexto.visaoDeCliente || dados.visivelCliente;
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    const acao = contexto.visaoDeCliente ? "Complemento do solicitante" : visivelCliente ? "Mensagem ao solicitante" : "Registro interno";
    extras.eventos.push(novoEvento("ATUALIZACAO", acao, texto, autor, visivelCliente, agora));
    if (!contexto.visaoDeCliente && visivelCliente && !extras.primeiraRespostaEm) extras.primeiraRespostaEm = agora.toISOString();
  });
  return responderComChamado(contexto, codigo, 201);
}

async function registrarLocalizacao(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  const codigo = contexto.parametros.codigo;
  const localizacao = localizacaoValida(contexto.corpo<Localizacao>());
  if (!localizacao) recusar(400, "Um ou mais campos são inválidos.", { endereco: "Informe um endereço ou use a localização do aparelho." });
  await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    extras.localizacao = localizacao;
    const origem = localizacao.latitude !== null ? "GPS do aparelho" : "endereço informado";
    extras.eventos.push(novoEvento("LOCALIZACAO", "Localização registrada", `${localizacao.endereco} · ${origem}`, autor, true, agora));
  });
  return responderComChamado(contexto, codigo);
}

async function enviarAnexo(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  const codigo = contexto.parametros.codigo;
  const chave = contexto.headers.get("Idempotency-Key");
  const chaveCompleta = chave ? `anexo:${codigo}:${chave}` : null;
  const anexoExistente = chaveCompleta ? carregarEstado().chavesIdempotencia[chaveCompleta] : undefined;
  if (anexoExistente) {
    const anexo = carregarEstado().chamados[codigo]?.anexos.find((item) => item.id === anexoExistente);
    if (anexo) return json(anexo, 200);
  }
  const arquivo = contexto.formulario()?.get("arquivo");
  if (!(arquivo instanceof Blob)) recusar(400, "Um ou mais campos são inválidos.", { arquivo: "Selecione um arquivo." });
  const nome = arquivo instanceof File ? arquivo.name : "arquivo";
  const rejeicao = motivoDeRejeicao({ name: nome, type: arquivo.type, size: arquivo.size });
  if (rejeicao) recusar(rejeicao.motivo === "TAMANHO" ? 413 : 415, rejeicao.mensagem);
  await buscarReal(contexto, codigo);
  const autor = await contexto.autor();
  const agora = new Date();
  const anexo: Anexo = { id: gerarId(), nome, tipoConteudo: arquivo.type, tamanho: arquivo.size, enviadoEm: agora.toISOString(), autor };
  await guardarArquivo(anexo.id, arquivo);
  alterarEstado((estado) => {
    const extras = extrasDo(estado, codigo);
    extras.anexos.push(anexo);
    extras.eventos.push(novoEvento("ANEXO", "Anexo adicionado", nome, autor, true, agora));
    if (chaveCompleta) estado.chavesIdempotencia[chaveCompleta] = anexo.id;
  });
  return json(anexo, 201);
}

async function baixarAnexo(contexto: ContextoSimulado) {
  exigirAutenticacao(contexto);
  const { codigo, anexoId } = contexto.parametros;
  await buscarReal(contexto, codigo);
  const anexo = carregarEstado().chamados[codigo]?.anexos.find((item) => item.id === anexoId);
  const conteudo = anexo ? await lerArquivo(anexo.id) : null;
  if (!anexo || !conteudo) recusar(404, "O arquivo não está mais disponível nesta simulação.");
  return new Response(conteudo, { status: 200, headers: { "Content-Type": anexo.tipoConteudo } });
}

async function excluir(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigo = contexto.parametros.codigo;
  await buscarReal(contexto, codigo);
  alterarEstado((estado) => { extrasDo(estado, codigo).excluido = true; });
  return semConteudo();
}

async function listarLixeira(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigos = Object.entries(carregarEstado().chamados)
    .filter(([, extras]) => extras.excluido && !extras.removido)
    .map(([codigo]) => codigo);
  const reais = await Promise.all(codigos.map((codigo) => contexto.realJson<ChamadoReal>(caminhoReal(codigo))));
  const agora = new Date();
  return json(alterarEstado((estado) => reais.map((real) => montarResumo(estado, real, agora))));
}

async function restaurar(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigo = contexto.parametros.codigo;
  alterarEstado((estado) => { extrasDo(estado, codigo).excluido = false; });
  return responderComChamado(contexto, codigo);
}

async function excluirDefinitivamente(contexto: ContextoSimulado) {
  exigirPerfil(contexto, PERFIS_DA_CENTRAL);
  const codigos = contexto.parametros.codigo ? [contexto.parametros.codigo] : Object.keys(carregarEstado().chamados);
  alterarEstado((estado) => {
    for (const codigo of codigos) {
      const extras = estado.chamados[codigo];
      if (extras?.excluido) extras.removido = true;
    }
  });
  return semConteudo();
}

function departamentos() {
  return Promise.resolve(json(TIPOS_CHAMADO.map((codigo: TipoChamado) => ({ codigo, nome: NOME_TIPO[codigo] }))));
}

export const rotasDeChamados: RotaSimulada[] = [
  { metodo: "GET", padrao: "/api/departamentos", tratar: departamentos },
  { metodo: "GET", padrao: "/api/chamados/resumo", tratar: resumir },
  { metodo: "GET", padrao: "/api/chamados/lixeira", tratar: listarLixeira },
  { metodo: "DELETE", padrao: "/api/chamados/lixeira", tratar: excluirDefinitivamente },
  { metodo: "DELETE", padrao: "/api/chamados/lixeira/:codigo", tratar: excluirDefinitivamente },
  { metodo: "POST", padrao: "/api/chamados", tratar: abrir },
  { metodo: "GET", padrao: "/api/chamados", tratar: listar },
  { metodo: "GET", padrao: "/api/chamados/:codigo", tratar: consultar },
  { metodo: "DELETE", padrao: "/api/chamados/:codigo", tratar: excluir },
  { metodo: "POST", padrao: "/api/chamados/:codigo/restauracao", tratar: restaurar },
  { metodo: "PATCH", padrao: "/api/chamados/:codigo/status", tratar: alterarStatus },
  { metodo: "POST", padrao: "/api/chamados/:codigo/transferencias", tratar: transferir },
  { metodo: "PUT", padrao: "/api/chamados/:codigo/classificacao", tratar: reclassificar },
  { metodo: "PUT", padrao: "/api/chamados/:codigo/override", tratar: definirOverride },
  { metodo: "DELETE", padrao: "/api/chamados/:codigo/override", tratar: removerOverride },
  { metodo: "POST", padrao: "/api/chamados/:codigo/atualizacoes", tratar: registrarAtualizacao },
  { metodo: "PUT", padrao: "/api/chamados/:codigo/localizacao", tratar: registrarLocalizacao },
  { metodo: "POST", padrao: "/api/chamados/:codigo/anexos", tratar: enviarAnexo },
  { metodo: "GET", padrao: "/api/chamados/:codigo/anexos/:anexoId/conteudo", tratar: baixarAnexo },
];
