import type {
  Anexo, Autor, Chamado, ChamadoResumo, Classificacao, CodigoPrioridade, EventoTimeline, Localizacao, MotivoAguardando, Notificacao,
  OverridePrioridade, Peso, PrazoSla, ServicoTerceiro, SituacaoSla, Status, StatusServico, TipoChamado, TipoEvento, Triagem,
} from "@/types/chamado";
import { CONTEXTOS, MOTIVOS, contextoPorId, motivoPorId } from "./matriz";

export interface UsuarioDeTeste {
  id: string;
  nome: string;
  email: string;
  perfis: string[];
  organizacao: { id: string; nome: string; tipo: "CLIENTE" | "FORNECEDOR" } | null;
  departamentos: { codigo: string; nome: string }[];
}

export const SENHA_DE_TESTE = "senha-de-teste";

export const USUARIOS: Record<string, UsuarioDeTeste> = {
  cliente: { id: "u-cliente", nome: "Carla Cliente", email: "cliente@viaflux.test", perfis: ["CLIENTE"], organizacao: null, departamentos: [] },
  outroCliente: { id: "u-outro-cliente", nome: "Otávio Outro", email: "outro@viaflux.test", perfis: ["CLIENTE"], organizacao: null, departamentos: [] },
  atendente: { id: "u-atendente", nome: "Ana Atendente", email: "atendente@viaflux.test", perfis: ["ATENDENTE"], organizacao: null, departamentos: [] },
  lider: { id: "u-lider", nome: "Lia Líder", email: "lider@viaflux.test", perfis: ["LIDER_OPERACIONAL"], organizacao: null, departamentos: [] },
  admin: { id: "u-admin", nome: "Adão Admin", email: "admin@viaflux.test", perfis: ["ADMIN"], organizacao: null, departamentos: [] },
  fornecedor: {
    id: "u-fornecedor", nome: "Fábio Fornecedor", email: "fornecedor@viaflux.test", perfis: ["FORNECEDOR"],
    organizacao: { id: "org-guincho-teste", nome: "Guincho Teste", tipo: "FORNECEDOR" }, departamentos: [],
  },
  departamento: {
    id: "u-departamento", nome: "Davi Departamento", email: "departamento@viaflux.test", perfis: ["DEPARTAMENTO"],
    organizacao: null, departamentos: [{ codigo: "ASSISTENCIA_24H", nome: "Assistência 24h" }],
  },
  manutencao: {
    id: "u-manutencao", nome: "Mara Manutenção", email: "manutencao@viaflux.test", perfis: ["DEPARTAMENTO"],
    organizacao: null, departamentos: [{ codigo: "MANUTENCAO", nome: "Manutenção" }],
  },
};

const NOME_DO_DEPARTAMENTO: Record<TipoChamado, string> = {
  ASSISTENCIA_24H: "Assistência 24h", MANUTENCAO: "Manutenção", LOGISTICA: "Logística", TI: "Tecnologia", FINANCEIRO: "Financeiro", CONTRATOS: "Contratos",
};
const ROTULO_DO_PESO: Record<Peso, string> = { 5: "Alta", 3: "Média", 1: "Baixa" };
const ROTULO_DA_PRIORIDADE: Record<CodigoPrioridade, string> = { P1: "Crítica", P2: "Alta", P3: "Média", P4: "Baixa" };
const STATUS_DA_ORDEM: StatusServico[] = ["SOLICITADO", "RECEBIDO", "EM_EXECUCAO", "CONCLUIDO"];
const ROTULO_DO_SERVICO: Record<StatusServico, string> = { SOLICITADO: "Solicitado", RECEBIDO: "Recebido", EM_EXECUCAO: "Em execução", CONCLUIDO: "Concluído" };
const ROTULO_DO_AGUARDANDO: Record<MotivoAguardando, string> = { CLIENTE: "cliente", FORNECEDOR: "fornecedor", OUTRO_DEPARTAMENTO: "outro departamento" };
const PRAZO_DA_TRIAGEM_POR_URGENCIA: Record<Peso, number> = { 5: 10, 3: 20, 1: 40 };
const MINUTOS_DE_SLA: Record<CodigoPrioridade, { primeiraResposta: number; resolucao: number }> = {
  P1: { primeiraResposta: 15, resolucao: 120 },
  P2: { primeiraResposta: 30, resolucao: 240 },
  P3: { primeiraResposta: 60, resolucao: 480 },
  P4: { primeiraResposta: 120, resolucao: 960 },
};
const STATUS_AGUARDANDO_TRIAGEM: Status[] = ["Aberto", "Em triagem"];
const PERFIS_GLOBAIS = ["ADMIN", "ATENDENTE", "LIDER_OPERACIONAL"];
const PERFIS_DE_CLIENTE = ["CLIENTE", "GESTOR_FROTA"];
const PERFIS_DE_TRIAGEM = ["ADMIN", "ATENDENTE"];
const PERFIS_DA_CENTRAL = [...PERFIS_GLOBAIS, "DEPARTAMENTO"];
const PERFIS_DA_LIXEIRA = ["ADMIN", "ATENDENTE"];
const PERFIS_QUE_CONDUZEM_QUALQUER_FILA = ["ADMIN", "ATENDENTE"];
const PERFIS_QUE_ATENDEM_QUALQUER_FILA = ["ADMIN", "ATENDENTE"];
const STATUS_QUE_PODEM_SER_ASSUMIDOS: Status[] = ["Na fila", "Em atendimento", "Aguardando"];
const SO_ACOMPANHA = "Seu perfil só acompanha este chamado.";
const PERFIS_QUE_ABREM = [...PERFIS_DE_CLIENTE, ...PERFIS_DE_TRIAGEM];
const PERFIS_DE_METRICAS = ["ADMIN", "LIDER_OPERACIONAL"];
const VALIDADE_DO_ACCESS_TOKEN_S = 900;
const MINUTO_MS = 60_000;
const SISTEMA: Autor = { id: null, nome: "Sistema" };
const FORNECEDORES = [{ id: "org-guincho-teste", nome: "Guincho Teste", especialidade: "Fornecedor cadastrado" }];

interface ChamadoArmazenado {
  id: string;
  cliente: string;
  telefone: string;
  modelo: string;
  placa: string;
  descricao: string;
  localizacao: Localizacao | null;
  status: Status;
  abertura: Date;
  atualizadoEm: Date;
  solicitanteId: string;
  motivoId: string;
  contextoId: string;
  tipoDeclarado: TipoChamado;
  classificacao: Omit<Classificacao, "score" | "prioridade"> | null;
  override: OverridePrioridade | null;
  departamento: TipoChamado | null;
  motivoAguardando: MotivoAguardando | null;
  triagem: { limite: Date; prazoMinutos: number; iniciadaEm: Date | null; responsavel: Autor | null; concluidaEm: Date | null; concluidaPor: Autor | null };
  primeiraRespostaEm: Date | null;
  atendimento: { responsavel: Autor; assumidoEm: Date } | null;
  resolvidoEm: Date | null;
  timeline: EventoTimeline[];
  anexos: Anexo[];
  servico: ServicoTerceiro | null;
  excluido: boolean;
  chaveIdempotencia: string | null;
}

export interface RespostaFalsa {
  status: number;
  corpo: string;
  tipoConteudo: string;
}

class Recusa extends Error {
  constructor(public readonly resposta: RespostaFalsa) {
    super(resposta.corpo);
  }
}

function base64Url(texto: string) {
  return Buffer.from(texto, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function tokenDeAcesso(usuario: UsuarioDeTeste, geracao = 0) {
  return [base64Url(JSON.stringify({ alg: "HS256" })), base64Url(JSON.stringify({ sub: usuario.id, perfis: usuario.perfis, tipo: "acesso", geracao })), "assinatura"].join(".");
}

export function tokenDeRenovacao(usuario: UsuarioDeTeste) {
  return `renovacao:${usuario.id}`;
}

function json(corpo: unknown, status = 200): RespostaFalsa {
  return { status, corpo: JSON.stringify(corpo), tipoConteudo: "application/json" };
}

function semConteudo(): RespostaFalsa {
  return { status: 204, corpo: "", tipoConteudo: "application/json" };
}

function problema(status: number, detail: string, errors?: Record<string, string>): RespostaFalsa {
  return { status, corpo: JSON.stringify({ status, detail, ...(errors ? { errors } : {}) }), tipoConteudo: "application/problem+json" };
}

function recusar(status: number, detail: string, errors?: Record<string, string>): never {
  throw new Recusa(problema(status, detail, errors));
}

function comoNaApi(usuario: UsuarioDeTeste) {
  return { ...usuario, perfis: usuario.perfis.map((codigo) => ({ codigo, descricao: codigo })) };
}

function sessao(usuario: UsuarioDeTeste, geracao: number) {
  return { accessToken: tokenDeAcesso(usuario, geracao), refreshToken: tokenDeRenovacao(usuario), tokenType: "Bearer", expiresIn: VALIDADE_DO_ACCESS_TOKEN_S, usuario: comoNaApi(usuario) };
}

function horarioDeSaoPaulo(data: Date) {
  const local = new Date(data.getTime() - 3 * 60 * MINUTO_MS);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

function prioridadePorScore(score: number): CodigoPrioridade {
  if (score >= 10) return "P1";
  if (score >= 8) return "P2";
  if (score >= 6) return "P3";
  return "P4";
}

function ehPeso(valor: unknown): valor is Peso {
  return valor === 1 || valor === 3 || valor === 5;
}

function ehDepartamento(valor: unknown): valor is TipoChamado {
  return typeof valor === "string" && valor in NOME_DO_DEPARTAMENTO;
}

export function criarBackendFalso(opcoes: { agora?: () => Date } = {}) {
  const agora = opcoes.agora ?? (() => new Date());
  const chamados: ChamadoArmazenado[] = [];
  const notificacoes: (Notificacao & { destinatarioId: string })[] = [];
  const contagem = { aberturas: 0, requisicoes: 0 };
  const contagemDeRenovacoes = { total: 0 };
  let geracaoDosTokens = 0;
  let sequencia = 0;

  const novoId = (prefixo: string) => `${prefixo}-${(sequencia += 1)}`;
  const autorDe = (usuario: UsuarioDeTeste): Autor => ({ id: usuario.id, nome: usuario.nome });

  function usuarioDoCabecalho(autorizacao: string | undefined) {
    const token = autorizacao?.startsWith("Bearer ") ? autorizacao.slice(7) : null;
    if (!token) return null;
    return Object.values(USUARIOS).find((usuario) => tokenDeAcesso(usuario, geracaoDosTokens) === token) ?? null;
  }

  function registrar(chamado: ChamadoArmazenado, tipo: TipoEvento, acao: string, detalhe: string, autor: Autor | null, visivelCliente: boolean) {
    const instante = agora();
    chamado.timeline.push({ id: novoId("evento"), tipo, acao, detalhe, ocorridoEm: horarioDeSaoPaulo(instante), autor, visivelCliente });
    chamado.atualizadoEm = instante;
  }

  function avisar(chamado: ChamadoArmazenado, novoStatus: string, mensagem: string) {
    notificacoes.unshift({ id: novoId("notificacao"), destinatarioId: chamado.solicitanteId, chamadoId: chamado.id, novoStatus, mensagem, criadaEm: horarioDeSaoPaulo(agora()), lida: false });
  }

  const triado = (chamado: ChamadoArmazenado) => chamado.classificacao !== null;
  const score = (chamado: ChamadoArmazenado) => (chamado.classificacao ? chamado.classificacao.severidade + chamado.classificacao.urgencia : null);
  const prioridadeCalculada = (chamado: ChamadoArmazenado) => {
    const valor = score(chamado);
    return valor === null ? null : prioridadePorScore(valor);
  };
  const prioridadeEfetiva = (chamado: ChamadoArmazenado) => chamado.override?.prioridade ?? prioridadeCalculada(chamado);

  function prazo(limite: Date, cumpridoEm: Date | null): PrazoSla {
    const situacao: SituacaoSla = cumpridoEm
      ? (cumpridoEm.getTime() <= limite.getTime() ? "CUMPRIDO" : "CUMPRIDO_COM_ATRASO")
      : (agora().getTime() > limite.getTime() ? "VIOLADO" : "NO_PRAZO");
    return { limite: horarioDeSaoPaulo(limite), cumpridoEm: cumpridoEm ? horarioDeSaoPaulo(cumpridoEm) : null, situacao };
  }

  function sla(chamado: ChamadoArmazenado) {
    const prioridade = prioridadeEfetiva(chamado);
    if (!prioridade) return null;
    const minutos = MINUTOS_DE_SLA[prioridade];
    const inicio = chamado.abertura.getTime();
    return {
      primeiraResposta: prazo(new Date(inicio + minutos.primeiraResposta * MINUTO_MS), chamado.primeiraRespostaEm),
      resolucao: prazo(new Date(inicio + minutos.resolucao * MINUTO_MS), chamado.resolvidoEm),
      pausado: chamado.motivoAguardando === "CLIENTE",
      tempoPausadoMinutos: 0,
    };
  }

  function triagem(chamado: ChamadoArmazenado): Triagem {
    const { limite, prazoMinutos, iniciadaEm, responsavel, concluidaEm, concluidaPor } = chamado.triagem;
    return {
      limite: horarioDeSaoPaulo(limite),
      prazoMinutos,
      iniciadaEm: iniciadaEm ? horarioDeSaoPaulo(iniciadaEm) : null,
      responsavel,
      concluidaEm: concluidaEm ? horarioDeSaoPaulo(concluidaEm) : null,
      concluidaPor,
      situacao: prazo(limite, concluidaEm).situacao,
    };
  }

  function resumo(chamado: ChamadoArmazenado): ChamadoResumo {
    return {
      id: chamado.id,
      cliente: chamado.cliente,
      modelo: chamado.modelo,
      placa: chamado.placa,
      localizacao: chamado.localizacao?.endereco ?? "",
      status: chamado.status,
      prioridade: prioridadeEfetiva(chamado),
      score: score(chamado),
      tipo: chamado.classificacao?.tipo ?? chamado.tipoDeclarado,
      departamento: chamado.departamento ? { codigo: chamado.departamento, nome: NOME_DO_DEPARTAMENTO[chamado.departamento] } : null,
      abertura: horarioDeSaoPaulo(chamado.abertura),
      atualizadoEm: horarioDeSaoPaulo(chamado.atualizadoEm),
      sla: sla(chamado),
      triagem: triagem(chamado),
      atendimento: chamado.atendimento ? { responsavel: chamado.atendimento.responsavel, assumidoEm: horarioDeSaoPaulo(chamado.atendimento.assumidoEm) } : null,
    };
  }

  function completo(chamado: ChamadoArmazenado, visaoDeCliente: boolean): Chamado {
    const valorDoScore = score(chamado);
    return {
      ...resumo(chamado),
      telefone: chamado.telefone,
      descricao: chamado.descricao,
      motivo: motivoPorId(chamado.motivoId),
      contexto: contextoPorId(chamado.contextoId),
      classificacao: chamado.classificacao && valorDoScore !== null ? { ...chamado.classificacao, score: valorDoScore, prioridade: prioridadePorScore(valorDoScore) } : null,
      override: chamado.override,
      motivoAguardando: chamado.motivoAguardando,
      localizacaoDetalhada: chamado.localizacao,
      timeline: visaoDeCliente ? chamado.timeline.filter((evento) => evento.visivelCliente) : chamado.timeline,
      anexos: chamado.anexos,
      servico: visaoDeCliente ? null : chamado.servico,
    };
  }

  function responder(metodo: string, endereco: string, corpo: string | null, cabecalhos: Record<string, string | undefined>): RespostaFalsa {
    contagem.requisicoes += 1;
    try {
      return rotear(metodo, new URL(endereco), corpo, cabecalhos);
    } catch (erro) {
      if (erro instanceof Recusa) return erro.resposta;
      throw erro;
    }
  }

  function rotear(metodo: string, url: URL, corpo: string | null, cabecalhos: Record<string, string | undefined>): RespostaFalsa {
    const caminho = url.pathname;
    const dados = (corpo && corpo.trim().startsWith("{") ? JSON.parse(corpo) : {}) as Record<string, unknown>;
    const texto = (campo: string) => (typeof dados[campo] === "string" ? (dados[campo] as string) : "");

    if (metodo === "POST" && caminho === "/auth/login") {
      const usuario = Object.values(USUARIOS).find((candidato) => candidato.email === texto("email").toLowerCase());
      if (!usuario || texto("senha") !== SENHA_DE_TESTE) return problema(401, "E-mail ou senha inválidos.");
      return json(sessao(usuario, geracaoDosTokens));
    }
    if (metodo === "POST" && caminho === "/auth/refresh") {
      const usuario = Object.values(USUARIOS).find((candidato) => tokenDeRenovacao(candidato) === texto("refreshToken"));
      if (!usuario) return problema(401, "Sessão expirada. Entre novamente.");
      contagemDeRenovacoes.total += 1;
      return json(sessao(usuario, geracaoDosTokens));
    }

    const usuario = usuarioDoCabecalho(cabecalhos.authorization ?? cabecalhos.Authorization);
    if (!usuario) return problema(401, "Autenticação é necessária para acessar este recurso.");
    const temPerfil = (perfis: string[]) => usuario.perfis.some((perfil) => perfis.includes(perfil));
    const exigir = (perfis: string[]) => { if (!temPerfil(perfis)) recusar(403, "Você não tem permissão para acessar este recurso."); };
    const global = temPerfil(PERFIS_GLOBAIS);
    const apenasCliente = temPerfil(PERFIS_DE_CLIENTE) && !temPerfil(PERFIS_DA_CENTRAL);
    const departamentosDoUsuario = usuario.departamentos.map((departamento) => departamento.codigo);

    const visivel = (chamado: ChamadoArmazenado) => !chamado.excluido && (
      global
      || (temPerfil(["DEPARTAMENTO"]) && triado(chamado) && chamado.departamento !== null && departamentosDoUsuario.includes(chamado.departamento))
      || (temPerfil(PERFIS_DE_CLIENTE) && chamado.solicitanteId === usuario.id)
    );
    const buscar = (codigo: string) => chamados.find((chamado) => chamado.id === decodeURIComponent(codigo) && visivel(chamado)) ?? recusar(404, `Chamado ${codigo} não encontrado.`);
    const naFila = (chamado: ChamadoArmazenado) => temPerfil(["DEPARTAMENTO"]) && chamado.departamento !== null && departamentosDoUsuario.includes(chamado.departamento);
    const conduz = (chamado: ChamadoArmazenado) => temPerfil(PERFIS_QUE_CONDUZEM_QUALQUER_FILA) || naFila(chamado);
    const atende = (chamado: ChamadoArmazenado) => temPerfil(PERFIS_QUE_ATENDEM_QUALQUER_FILA) || naFila(chamado);
    const paraConduzir = (codigo: string) => {
      const chamado = buscar(codigo);
      if (!conduz(chamado)) recusar(403, SO_ACOMPANHA);
      return chamado;
    };
    const paraAtender = (codigo: string) => {
      const chamado = buscar(codigo);
      if (!atende(chamado)) recusar(403, "Só o departamento responsável pelo chamado assume e muda o status do atendimento.");
      return chamado;
    };
    const exigirQueConduzaOuSejaOCliente = (chamado: ChamadoArmazenado) => { if (!apenasCliente && !conduz(chamado)) recusar(403, SO_ACOMPANHA); };
    const exigirTriagem = (chamado: ChamadoArmazenado) => { if (!triado(chamado)) recusar(409, "Conclua a triagem do chamado antes desta ação."); };
    const devolver = (chamado: ChamadoArmazenado, status = 200) => json(completo(chamado, apenasCliente), status);

    if (metodo === "GET" && caminho === "/auth/me") return json(comoNaApi(usuario));
    if (metodo === "GET" && caminho === "/api/admin/usuarios/opcoes") {
      exigir(["ADMIN"]);
      return json({ perfis: [], departamentos: [], organizacoes: [USUARIOS.fornecedor.organizacao] });
    }
    if (metodo === "GET" && caminho === "/api/solicitantes") {
      exigir(PERFIS_DE_TRIAGEM);
      const busca = (url.searchParams.get("busca") ?? "").toLowerCase();
      return json(Object.values(USUARIOS)
        .filter((candidato) => candidato.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil)))
        .filter((candidato) => `${candidato.nome} ${candidato.email}`.toLowerCase().includes(busca))
        .map((candidato) => ({ id: candidato.id, nome: candidato.nome, email: candidato.email, organizacao: candidato.organizacao?.nome ?? null })));
    }
    if (metodo === "GET" && caminho === "/api/classificacao/motivos") return json(MOTIVOS);
    if (metodo === "GET" && caminho === "/api/classificacao/contextos") return json(CONTEXTOS.filter((contexto) => contexto.tipo === url.searchParams.get("tipo")));
    if (metodo === "GET" && caminho === "/api/departamentos") {
      return json((Object.keys(NOME_DO_DEPARTAMENTO) as TipoChamado[]).map((codigo) => ({ codigo, nome: NOME_DO_DEPARTAMENTO[codigo] })));
    }
    if (metodo === "GET" && caminho === "/api/enderecos/reverso") {
      const latitude = Number(url.searchParams.get("latitude"));
      const longitude = Number(url.searchParams.get("longitude"));
      return json({ descricao: "Rodovia Presidente Dutra · Guarulhos – SP", cep: "07034-911", logradouro: "Rodovia Presidente Dutra", numero: "", bairro: "Cumbica", cidade: "Guarulhos", uf: "SP", latitude, longitude });
    }
    if (metodo === "GET" && caminho.startsWith("/api/enderecos/cep/")) {
      return json({ descricao: "Avenida Paulista · Bela Vista · São Paulo – SP", cep: "01310-100", logradouro: "Avenida Paulista", numero: "", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP", latitude: null, longitude: null });
    }
    if (metodo === "GET" && caminho === "/api/enderecos/busca") return json([]);

    if (metodo === "POST" && caminho === "/api/chamados") {
      exigir(PERFIS_QUE_ABREM);
      const chave = cabecalhos["idempotency-key"] ?? null;
      const repetido = chave ? chamados.find((chamado) => chamado.chaveIdempotencia === chave) : undefined;
      if (repetido) return devolver(repetido);
      const pelaCentral = temPerfil(PERFIS_DE_TRIAGEM) && !temPerfil(PERFIS_DE_CLIENTE);
      const solicitante = pelaCentral
        ? Object.values(USUARIOS).find((candidato) => candidato.id === texto("solicitanteId") && candidato.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil)))
        : usuario;
      if (!solicitante) recusar(400, "Um ou mais campos são inválidos.", { solicitanteId: texto("solicitanteId") ? "Selecione um cliente ativo como solicitante." : "Informe o cliente solicitante." });
      const motivo = motivoPorId(texto("motivoId"));
      const contexto = contextoPorId(texto("contextoId"));
      const erros: Record<string, string> = {};
      if (!motivo) erros.motivoId = "Selecione o motivo da solicitação.";
      if (!contexto || contexto.tipo !== motivo?.tipo) erros.contextoId = "Selecione o contexto situacional.";
      if (!texto("descricao").trim()) erros.descricao = "Descreva o problema.";
      if (!texto("cliente").trim()) erros.cliente = "Informe o nome do solicitante.";
      if (Object.keys(erros).length > 0 || !motivo || !contexto) recusar(400, "Um ou mais campos são inválidos.", erros);
      contagem.aberturas += 1;
      const abertura = agora();
      const prazoMinutos = PRAZO_DA_TRIAGEM_POR_URGENCIA[contexto.urgencia];
      const chamado: ChamadoArmazenado = {
        id: `VF-${String(chamados.length).padStart(4, "0")}`,
        cliente: texto("cliente").trim(),
        telefone: texto("telefone"),
        modelo: texto("modelo").trim(),
        placa: texto("placa").toUpperCase(),
        descricao: texto("descricao"),
        localizacao: (dados.localizacao as Localizacao | null) ?? null,
        status: "Aberto",
        abertura,
        atualizadoEm: abertura,
        solicitanteId: solicitante.id,
        motivoId: motivo.id,
        contextoId: contexto.id,
        tipoDeclarado: motivo.tipo,
        classificacao: null,
        override: null,
        departamento: null,
        motivoAguardando: null,
        triagem: { limite: new Date(abertura.getTime() + prazoMinutos * MINUTO_MS), prazoMinutos, iniciadaEm: null, responsavel: null, concluidaEm: null, concluidaPor: null },
        primeiraRespostaEm: null,
        atendimento: null,
        resolvidoEm: null,
        timeline: [],
        anexos: [],
        servico: null,
        excluido: false,
        chaveIdempotencia: chave,
      };
      chamados.push(chamado);
      registrar(chamado, "ABERTURA", "Chamado aberto", "Chamado registrado pelo portal ViaFlux.", autorDe(solicitante), true);
      registrar(chamado, "TRIAGEM", "Aguardando triagem", `Um atendente vai analisar a solicitação em até ${prazoMinutos} minutos.`, SISTEMA, true);
      return devolver(chamado, 201);
    }

    if (metodo === "GET" && caminho === "/api/chamados") {
      const parametro = (nome: string) => url.searchParams.get(nome) ?? "";
      const busca = parametro("busca").toLowerCase();
      const page = Number(parametro("page") || 0);
      const size = Number(parametro("size") || 20);
      const encontrados = chamados.filter(visivel)
        .filter((chamado) => !busca || [chamado.id, chamado.cliente, chamado.modelo, chamado.placa].some((campo) => campo.toLowerCase().includes(busca)))
        .filter((chamado) => !parametro("status") || chamado.status === parametro("status"))
        .filter((chamado) => !parametro("prioridade") || prioridadeEfetiva(chamado) === parametro("prioridade"))
        .filter((chamado) => !parametro("departamento") || chamado.departamento === parametro("departamento"))
        .filter((chamado) => !parametro("etapa") || (parametro("etapa") === "TRIAGEM") !== triado(chamado))
        .sort(parametro("ordenacao") === "ativos_recentes"
          ? (a, b) => Number(!["Resolvido", "Fechado"].includes(b.status)) - Number(!["Resolvido", "Fechado"].includes(a.status))
            || b.atualizadoEm.getTime() - a.atualizadoEm.getTime()
            || b.abertura.getTime() - a.abertura.getTime()
            || b.id.localeCompare(a.id)
          : parametro("ordenacao") === "recentes"
          ? (a, b) => b.abertura.getTime() - a.abertura.getTime() || b.id.localeCompare(a.id)
          : (a, b) => Number(triado(a)) - Number(triado(b))
            || (triado(a) ? 0 : a.triagem.limite.getTime() - b.triagem.limite.getTime())
            || String(prioridadeEfetiva(a)).localeCompare(String(prioridadeEfetiva(b)))
            || a.abertura.getTime() - b.abertura.getTime());
      return json({
        content: encontrados.slice(page * size, (page + 1) * size).map(resumo),
        page,
        size,
        totalElements: encontrados.length,
        totalPages: Math.ceil(encontrados.length / size),
      });
    }

    if (metodo === "GET" && caminho === "/api/chamados/resumo") {
      exigir(PERFIS_DA_CENTRAL);
      const visiveis = chamados.filter(visivel);
      const contar = <Chave extends string>(chaveDe: (chamado: ChamadoArmazenado) => Chave | null) =>
        visiveis.reduce<Record<string, number>>((total, chamado) => {
          const chave = chaveDe(chamado);
          if (chave) total[chave] = (total[chave] ?? 0) + 1;
          return total;
        }, {});
      const contadores = (qual: "primeiraResposta" | "resolucao") => {
        const situacoes = visiveis.map((chamado) => sla(chamado)?.[qual].situacao).filter(Boolean);
        return { noPrazo: situacoes.filter((situacao) => situacao === "NO_PRAZO").length, emRisco: situacoes.filter((situacao) => situacao === "EM_RISCO").length, violado: situacoes.filter((situacao) => situacao === "VIOLADO").length };
      };
      const naTriagem = visiveis.filter((chamado) => !triado(chamado));
      const proximo = naTriagem.map((chamado) => chamado.triagem.limite.getTime()).sort((a, b) => a - b)[0];
      return json({
        total: visiveis.length,
        porStatus: contar((chamado) => chamado.status),
        porPrioridade: contar(prioridadeEfetiva),
        porDepartamento: contar((chamado) => chamado.departamento),
        sla: { primeiraResposta: contadores("primeiraResposta"), resolucao: contadores("resolucao") },
        p1SemPrimeiraResposta: visiveis
          .filter((chamado) => prioridadeEfetiva(chamado) === "P1" && !chamado.primeiraRespostaEm && chamado.status !== "Resolvido" && chamado.status !== "Fechado")
          .map((chamado) => chamado.id),
        triagem: {
          aguardando: naTriagem.filter((chamado) => chamado.status === "Aberto").length,
          emAndamento: naTriagem.filter((chamado) => chamado.status === "Em triagem").length,
          emRisco: 0,
          atrasados: naTriagem.filter((chamado) => chamado.triagem.limite.getTime() < agora().getTime()).length,
          proximoLimite: proximo === undefined ? null : horarioDeSaoPaulo(new Date(proximo)),
        },
      });
    }

    if (caminho === "/api/chamados/lixeira") {
      exigir(PERFIS_DA_LIXEIRA);
      if (metodo === "GET") return json(chamados.filter((chamado) => chamado.excluido).map(resumo));
      if (metodo === "DELETE") {
        chamados.splice(0, chamados.length, ...chamados.filter((chamado) => !chamado.excluido));
        return semConteudo();
      }
    }

    if (metodo === "GET" && caminho === "/api/fornecedores") {
      exigir([...PERFIS_QUE_CONDUZEM_QUALQUER_FILA, "DEPARTAMENTO"]);
      return json(FORNECEDORES);
    }
    if (metodo === "GET" && caminho === "/api/fornecedor/servicos") {
      exigir(["FORNECEDOR"]);
      return json(chamados.filter((chamado) => chamado.servico?.fornecedor.id === usuario.organizacao?.id).map((chamado) => {
        const { fornecedor, ...servico } = chamado.servico as ServicoTerceiro;
        void fornecedor;
        return servico;
      }));
    }
    const atualizacaoDoFornecedor = /^\/api\/fornecedor\/servicos\/([^/]+)\/status$/.exec(caminho);
    if (metodo === "PATCH" && atualizacaoDoFornecedor) {
      exigir(["FORNECEDOR"]);
      const chamado = chamados.find((candidato) => candidato.servico?.id === atualizacaoDoFornecedor[1]) ?? recusar(404, "Serviço não encontrado.");
      const servico = chamado.servico as ServicoTerceiro;
      const novo = texto("status") as StatusServico;
      if (servico.status === "CONCLUIDO") recusar(409, "Este serviço já foi concluído.");
      if (STATUS_DA_ORDEM.indexOf(novo) <= STATUS_DA_ORDEM.indexOf(servico.status)) {
        recusar(409, `O serviço já está ${ROTULO_DO_SERVICO[servico.status]}. Só é possível avançar o status.`);
      }
      servico.status = novo;
      servico.atualizadoEm = horarioDeSaoPaulo(agora());
      servico.historico.unshift({ status: novo, observacao: texto("observacao"), registradoEm: servico.atualizadoEm, autor: autorDe(usuario) });
      registrar(chamado, "FORNECEDOR", `Fornecedor: ${ROTULO_DO_SERVICO[novo]}`, texto("observacao"), autorDe(usuario), false);
      avisar(chamado, `Serviço terceirizado ${ROTULO_DO_SERVICO[novo].toLowerCase()}`, `O serviço do chamado ${chamado.id} está ${ROTULO_DO_SERVICO[novo].toLowerCase()}.`);
      const { fornecedor, ...semFornecedor } = servico;
      void fornecedor;
      return json(semFornecedor);
    }

    if (metodo === "GET" && caminho === "/api/notificacoes") return json(notificacoes.filter((notificacao) => notificacao.destinatarioId === usuario.id));
    const leitura = /^\/api\/notificacoes\/([^/]+)\/lida$/.exec(caminho);
    if (metodo === "PATCH" && leitura) {
      notificacoes.filter((notificacao) => notificacao.id === leitura[1]).forEach((notificacao) => { notificacao.lida = true; });
      return semConteudo();
    }
    if (metodo === "POST" && caminho === "/api/notificacoes/leitura") {
      notificacoes.filter((notificacao) => notificacao.destinatarioId === usuario.id).forEach((notificacao) => { notificacao.lida = true; });
      return semConteudo();
    }

    if (metodo === "GET" && caminho === "/api/metricas") {
      exigir(PERFIS_DE_METRICAS);
      return json({
        periodo: { de: url.searchParams.get("de"), ate: url.searchParams.get("ate") },
        totalChamados: chamados.length,
        indicadores: [
          { chave: "tempo-triagem", rotulo: "Tempo médio de triagem", valor: null, unidade: "minutos", pendenteDeLevantamento: false, observacao: "Da abertura até a triagem concluída pelo atendente." },
          { chave: "csat", rotulo: "CSAT", valor: null, unidade: "percentual", pendenteDeLevantamento: true, observacao: "Depende de pesquisa de satisfação ainda não implantada." },
        ],
        distribuicaoPorPrioridade: { P1: 0, P2: 0, P3: 0, P4: 0 },
      });
    }
    if (metodo === "GET" && caminho === "/api/metricas/exportacao") {
      exigir(PERFIS_DE_METRICAS);
      return { status: 200, corpo: "protocolo;abertura\n", tipoConteudo: "text/csv" };
    }

    if (metodo === "GET" && caminho.startsWith("/api/dev/")) return problema(404, "Dev tools desabilitado.");

    const exclusaoDefinitiva = /^\/api\/chamados\/lixeira\/([^/]+)$/.exec(caminho);
    if (exclusaoDefinitiva && metodo === "DELETE") {
      exigir(PERFIS_DA_LIXEIRA);
      const indice = chamados.findIndex((chamado) => chamado.id === exclusaoDefinitiva[1] && chamado.excluido);
      if (indice < 0) recusar(404, `Chamado ${exclusaoDefinitiva[1]} não encontrado na lixeira.`);
      chamados.splice(indice, 1);
      return semConteudo();
    }

    const rota = /^\/api\/chamados\/([^/]+)(?:\/(.+))?$/.exec(caminho);
    if (!rota) return problema(404, `Recurso ${metodo} ${caminho} não existe no backend.`);
    const [, codigo, sufixo = ""] = rota;

    if (sufixo === "" && metodo === "GET") return devolver(buscar(codigo));
    if (sufixo === "" && metodo === "DELETE") {
      exigir(PERFIS_DA_LIXEIRA);
      buscar(codigo).excluido = true;
      return semConteudo();
    }
    if (sufixo === "restauracao" && metodo === "POST") {
      exigir(PERFIS_DA_LIXEIRA);
      const chamado = chamados.find((candidato) => candidato.id === codigo && candidato.excluido) ?? recusar(404, `Chamado ${codigo} não encontrado.`);
      chamado.excluido = false;
      return devolver(chamado);
    }

    if (sufixo === "triagem/inicio" && metodo === "POST") {
      exigir(PERFIS_DE_TRIAGEM);
      const chamado = buscar(codigo);
      if (triado(chamado)) recusar(409, "A triagem deste chamado já foi concluída.");
      chamado.status = "Em triagem";
      chamado.triagem.iniciadaEm ??= agora();
      chamado.triagem.responsavel = autorDe(usuario);
      registrar(chamado, "TRIAGEM", "Triagem iniciada", `Triagem assumida por ${usuario.nome}.`, autorDe(usuario), true);
      return devolver(chamado);
    }
    if (sufixo === "triagem" && metodo === "POST") {
      exigir(PERFIS_DE_TRIAGEM);
      const chamado = buscar(codigo);
      if (triado(chamado)) recusar(409, "A triagem deste chamado já foi concluída.");
      const tipo = dados.tipo;
      const { severidade, urgencia } = dados;
      if (!ehDepartamento(tipo) || !ehPeso(severidade) || !ehPeso(urgencia)) recusar(400, "Um ou mais campos são inválidos.", { tipo: "Classificação inválida." });
      const destino = ehDepartamento(dados.departamento) ? dados.departamento : tipo;
      const instante = agora();
      chamado.classificacao = { tipo, severidade, urgencia };
      chamado.departamento = destino;
      chamado.status = "Na fila";
      chamado.triagem.iniciadaEm ??= instante;
      chamado.triagem.responsavel = autorDe(usuario);
      chamado.triagem.concluidaEm = instante;
      chamado.triagem.concluidaPor = autorDe(usuario);
      const prioridade = prioridadePorScore(severidade + urgencia);
      registrar(chamado, "CLASSIFICACAO", "Triagem concluída",
        `${NOME_DO_DEPARTAMENTO[tipo]} · severidade ${ROTULO_DO_PESO[severidade]} (${severidade}) + urgência ${ROTULO_DO_PESO[urgencia]} (${urgencia}) = score ${severidade + urgencia} · ${prioridade} ${ROTULO_DA_PRIORIDADE[prioridade]}`,
        autorDe(usuario), false);
      registrar(chamado, "ROTEAMENTO", `Encaminhado para ${NOME_DO_DEPARTAMENTO[destino]}`, `Chamado direcionado para a fila de ${NOME_DO_DEPARTAMENTO[destino]}.`, autorDe(usuario), true);
      avisar(chamado, "Na fila", `O chamado ${chamado.id} foi analisado e encaminhado para ${NOME_DO_DEPARTAMENTO[destino]}.`);
      return devolver(chamado);
    }
    if (sufixo === "classificacao" && metodo === "PUT") {
      exigir(PERFIS_DE_TRIAGEM);
      const chamado = buscar(codigo);
      exigirTriagem(chamado);
      const tipo = dados.tipo;
      const { severidade, urgencia } = dados;
      if (!ehDepartamento(tipo) || !ehPeso(severidade) || !ehPeso(urgencia)) recusar(400, "Um ou mais campos são inválidos.", { tipo: "Classificação inválida." });
      chamado.classificacao = { tipo, severidade, urgencia };
      registrar(chamado, "RECLASSIFICACAO", "Chamado reclassificado", texto("justificativa"), autorDe(usuario), false);
      return devolver(chamado);
    }
    if (sufixo === "override" && metodo === "PUT") {
      exigir(PERFIS_DE_TRIAGEM);
      const chamado = buscar(codigo);
      exigirTriagem(chamado);
      chamado.override = { prioridade: texto("prioridade") as CodigoPrioridade, justificativa: texto("justificativa"), autor: autorDe(usuario), definidoEm: horarioDeSaoPaulo(agora()) };
      registrar(chamado, "OVERRIDE", "Prioridade alterada manualmente", texto("justificativa"), autorDe(usuario), false);
      return devolver(chamado);
    }
    if (sufixo === "override" && metodo === "DELETE") {
      exigir(PERFIS_DE_TRIAGEM);
      const chamado = buscar(codigo);
      chamado.override = null;
      registrar(chamado, "OVERRIDE", "Override removido", "Vale a prioridade calculada.", autorDe(usuario), false);
      return devolver(chamado);
    }
    if (sufixo === "atendimento" && metodo === "POST") {
      exigir(["ADMIN", "ATENDENTE", "DEPARTAMENTO"]);
      const chamado = paraAtender(codigo);
      exigirTriagem(chamado);
      if (!STATUS_QUE_PODEM_SER_ASSUMIDOS.includes(chamado.status)) recusar(409, "Chamados resolvidos ou fechados não podem ser assumidos.");
      if (chamado.status === "Em atendimento" && chamado.atendimento?.responsavel.id === usuario.id) recusar(409, "Você já está com este chamado.");
      const anterior = chamado.status;
      const responsavelAnterior = chamado.atendimento?.responsavel.nome ?? "Sem responsável";
      chamado.status = "Em atendimento";
      chamado.motivoAguardando = null;
      chamado.primeiraRespostaEm ??= agora();
      chamado.atendimento = { responsavel: autorDe(usuario), assumidoEm: agora() };
      if (anterior !== "Em atendimento") {
        registrar(chamado, "STATUS", "Status alterado para Em atendimento", `${anterior} → Em atendimento · assumido por ${usuario.nome}`, autorDe(usuario), true);
        avisar(chamado, "Em atendimento", `O chamado ${chamado.id} mudou para Em atendimento.`);
      } else {
        registrar(chamado, "STATUS", "Responsável alterado", `${responsavelAnterior} → ${usuario.nome}`, autorDe(usuario), false);
      }
      return devolver(chamado);
    }
    if (sufixo === "status" && metodo === "PATCH") {
      exigir(["ADMIN", "ATENDENTE", "DEPARTAMENTO"]);
      const chamado = paraAtender(codigo);
      exigirTriagem(chamado);
      const novo = texto("status") as Status;
      if (STATUS_AGUARDANDO_TRIAGEM.includes(novo)) recusar(400, "Um ou mais campos são inválidos.", { status: "Abertura e triagem não podem ser definidas manualmente." });
      const anterior = chamado.status;
      if (anterior === "Fechado") recusar(409, "Chamados fechados não podem mudar de status.");
      if (anterior === "Resolvido" && novo !== "Fechado") recusar(409, "Reabertura exige o fluxo específico de reabertura.");
      if (novo === "Fechado" && anterior !== "Resolvido") recusar(409, "Só é possível fechar um chamado depois de resolvido.");
      if (novo === anterior && (novo !== "Aguardando" || dados.motivoAguardando === chamado.motivoAguardando)) recusar(409, `O chamado já está ${novo}.`);
      if (novo === "Aguardando" && !dados.motivoAguardando) recusar(400, "Um ou mais campos são inválidos.", { motivoAguardando: "Informe quem está sendo aguardado." });
      if (novo === "Resolvido" && !texto("resumoResolucao").trim()) recusar(400, "Um ou mais campos são inválidos.", { resumoResolucao: "Informe o resumo da solução." });
      chamado.status = novo;
      chamado.motivoAguardando = novo === "Aguardando" ? (texto("motivoAguardando") as MotivoAguardando) : null;
      if (novo === "Em atendimento") chamado.primeiraRespostaEm ??= agora();
      if (novo === "Em atendimento") chamado.atendimento ??= { responsavel: autorDe(usuario), assumidoEm: agora() };
      if (novo === "Na fila") chamado.atendimento = null;
      if (novo === "Resolvido") chamado.resolvidoEm = agora();
      const aguardando = chamado.motivoAguardando ? ` · aguardando ${ROTULO_DO_AGUARDANDO[chamado.motivoAguardando]}` : "";
      const observacao = texto("observacao").trim() ? ` · ${texto("observacao").trim()}` : "";
      registrar(chamado, "STATUS", `Status alterado para ${novo}`, `${anterior} → ${novo}${aguardando}${observacao}`, autorDe(usuario), true);
      avisar(chamado, novo, `O chamado ${chamado.id} mudou para ${novo}.`);
      return devolver(chamado);
    }
    if (sufixo === "transferencias" && metodo === "POST") {
      const chamado = paraConduzir(codigo);
      exigirTriagem(chamado);
      const destino = dados.departamento;
      if (!ehDepartamento(destino)) recusar(400, "Um ou mais campos são inválidos.", { departamento: "Selecione um departamento de destino válido." });
      const origem = chamado.departamento as TipoChamado;
      chamado.departamento = destino;
      chamado.motivoAguardando = null;
      chamado.atendimento = null;
      if (chamado.status !== "Resolvido") chamado.status = "Na fila";
      registrar(chamado, "TRANSFERENCIA", "Chamado transferido", `${NOME_DO_DEPARTAMENTO[origem]} → ${NOME_DO_DEPARTAMENTO[destino]} · Motivo: ${texto("motivo").trim()}`, autorDe(usuario), false);
      registrar(chamado, "ROTEAMENTO", `Encaminhado para ${NOME_DO_DEPARTAMENTO[destino]}`, `O chamado entrou na fila de ${NOME_DO_DEPARTAMENTO[destino]}.`, SISTEMA, true);
      return devolver(chamado);
    }
    if (sufixo === "atualizacoes" && metodo === "POST") {
      const chamado = buscar(codigo);
      exigirQueConduzaOuSejaOCliente(chamado);
      const visivelCliente = apenasCliente || dados.visivelCliente === true;
      const acao = apenasCliente ? "Complemento do solicitante" : visivelCliente ? "Mensagem ao solicitante" : "Registro interno";
      registrar(chamado, "ATUALIZACAO", acao, texto("texto").trim(), autorDe(usuario), visivelCliente);
      return devolver(chamado, 201);
    }
    if (sufixo === "localizacao" && metodo === "PUT") {
      const chamado = buscar(codigo);
      exigirQueConduzaOuSejaOCliente(chamado);
      chamado.localizacao = dados as unknown as Localizacao;
      registrar(chamado, "LOCALIZACAO", "Localização registrada", texto("endereco"), autorDe(usuario), true);
      return devolver(chamado);
    }
    if (sufixo === "anexos" && metodo === "POST") {
      const chamado = buscar(codigo);
      exigirQueConduzaOuSejaOCliente(chamado);
      const nome = /filename="([^"]+)"/.exec(corpo ?? "")?.[1] ?? "arquivo";
      const anexo: Anexo = { id: novoId("anexo"), nome, tipoConteudo: "image/png", tamanho: corpo?.length ?? 0, enviadoEm: horarioDeSaoPaulo(agora()), autor: autorDe(usuario) };
      chamado.anexos.push(anexo);
      registrar(chamado, "ANEXO", "Anexo adicionado", nome, autorDe(usuario), true);
      return json(anexo, 201);
    }
    const conteudoDoAnexo = /^anexos\/([^/]+)\/conteudo$/.exec(sufixo);
    if (conteudoDoAnexo && metodo === "GET") {
      const anexo = buscar(codigo).anexos.find((candidato) => candidato.id === conteudoDoAnexo[1]) ?? recusar(404, "Anexo não encontrado.");
      return { status: 200, corpo: "conteudo", tipoConteudo: anexo.tipoConteudo };
    }
    if (sufixo === "servicos" && metodo === "POST") {
      const chamado = paraConduzir(codigo);
      exigirTriagem(chamado);
      const fornecedor = FORNECEDORES.find((candidato) => candidato.id === texto("fornecedorId")) ?? recusar(400, "Um ou mais campos são inválidos.", { fornecedorId: "Selecione um fornecedor credenciado." });
      const instante = horarioDeSaoPaulo(agora());
      chamado.servico = {
        id: novoId("servico"), chamadoId: chamado.id, fornecedor, tipoServico: texto("tipoServico"), local: texto("local"), observacao: texto("observacao"),
        status: "SOLICITADO", atualizadoEm: instante, historico: [{ status: "SOLICITADO", observacao: texto("observacao"), registradoEm: instante, autor: autorDe(usuario) }],
      };
      registrar(chamado, "FORNECEDOR", "Serviço terceirizado acionado", `${fornecedor.nome} · ${texto("tipoServico")}`, autorDe(usuario), false);
      return devolver(chamado, 201);
    }
    const cancelamento = /^servicos\/([^/]+)$/.exec(sufixo);
    if (cancelamento && metodo === "DELETE") {
      const chamado = paraConduzir(codigo);
      chamado.servico = null;
      registrar(chamado, "FORNECEDOR", "Serviço terceirizado cancelado", "", autorDe(usuario), false);
      return semConteudo();
    }

    return problema(404, `Recurso ${metodo} ${caminho} não existe no backend.`);
  }

  return {
    responder,
    contagem,
    chamados,
    contagemDeRenovacoes,
    expirarTokensDeAcesso: () => { geracaoDosTokens += 1; },
  };
}

export type BackendFalso = ReturnType<typeof criarBackendFalso>;
