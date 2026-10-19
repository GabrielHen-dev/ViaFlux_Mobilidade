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
};

const PERFIS_GLOBAIS = ["ADMIN", "ATENDENTE", "LIDER_OPERACIONAL"];
const PERFIS_DE_CLIENTE = ["CLIENTE", "GESTOR_FROTA"];
const PERFIS_QUE_ABREM_PELA_CENTRAL = ["ADMIN", "ATENDENTE"];
const PERFIS_QUE_ABREM = [...PERFIS_DE_CLIENTE, ...PERFIS_QUE_ABREM_PELA_CENTRAL];
const PERFIS_QUE_LISTAM = [...PERFIS_GLOBAIS, ...PERFIS_QUE_ABREM];
const VALIDADE_DO_ACCESS_TOKEN_S = 900;

interface ChamadoArmazenado {
  id: string;
  cliente: string;
  telefone: string;
  modelo: string;
  placa: string;
  tipo: string;
  prioridade: string;
  descricao: string;
  localizacao: string;
  status: string;
  abertura: string;
  solicitanteId: string;
}

export interface RespostaFalsa {
  status: number;
  corpo: string;
  tipoConteudo: string;
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

function problema(status: number, detail: string, errors?: Record<string, string>): RespostaFalsa {
  return { status, corpo: JSON.stringify({ status, detail, ...(errors ? { errors } : {}) }), tipoConteudo: "application/problem+json" };
}

function comoNaApi(usuario: UsuarioDeTeste) {
  return { ...usuario, perfis: usuario.perfis.map((codigo) => ({ codigo, descricao: codigo })) };
}

function sessao(usuario: UsuarioDeTeste, geracao: number) {
  return { accessToken: tokenDeAcesso(usuario, geracao), refreshToken: tokenDeRenovacao(usuario), tokenType: "Bearer", expiresIn: VALIDADE_DO_ACCESS_TOKEN_S, usuario: comoNaApi(usuario) };
}

function horarioDeSaoPaulo(data: Date) {
  const local = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
}

export function criarBackendFalso(opcoes: { agora?: () => Date } = {}) {
  const agora = opcoes.agora ?? (() => new Date());
  const chamados: ChamadoArmazenado[] = [];
  const contagem = { aberturas: 0, requisicoes: 0 };
  const contagemDeRenovacoes = { total: 0 };
  let geracaoDosTokens = 0;

  function usuarioDoCabecalho(autorizacao: string | undefined) {
    const token = autorizacao?.startsWith("Bearer ") ? autorizacao.slice(7) : null;
    if (!token) return null;
    return Object.values(USUARIOS).find((usuario) => tokenDeAcesso(usuario, geracaoDosTokens) === token) ?? null;
  }

  function itemDaLista(chamado: ChamadoArmazenado) {
    const { telefone, descricao, solicitanteId, ...item } = chamado;
    void telefone; void descricao; void solicitanteId;
    return item;
  }

  function detalhe(chamado: ChamadoArmazenado) {
    const { solicitanteId, ...semSolicitante } = chamado;
    void solicitanteId;
    return {
      ...semSolicitante,
      timeline: [{ hora: chamado.abertura.slice(11, 16), acao: "Chamado aberto", detalhe: "Chamado registrado pelo portal ViaFlux.", icon: "aberto", ocorridoEm: chamado.abertura }],
    };
  }

  function visiveisPara(usuario: UsuarioDeTeste) {
    const global = usuario.perfis.some((perfil) => PERFIS_GLOBAIS.includes(perfil));
    return chamados.filter((chamado) => global || chamado.solicitanteId === usuario.id);
  }

  function responder(metodo: string, endereco: string, corpo: string | null, cabecalhos: Record<string, string | undefined>): RespostaFalsa {
    contagem.requisicoes += 1;
    const url = new URL(endereco);
    const caminho = url.pathname;
    const dados = corpo ? (JSON.parse(corpo) as Record<string, string>) : {};

    if (metodo === "POST" && caminho === "/auth/login") {
      const usuario = Object.values(USUARIOS).find((candidato) => candidato.email === dados.email?.toLowerCase());
      if (!usuario || dados.senha !== SENHA_DE_TESTE) return problema(401, "E-mail ou senha inválidos.");
      return json(sessao(usuario, geracaoDosTokens));
    }
    if (metodo === "POST" && caminho === "/auth/refresh") {
      const usuario = Object.values(USUARIOS).find((candidato) => tokenDeRenovacao(candidato) === dados.refreshToken);
      if (!usuario) return problema(401, "Sessão expirada. Entre novamente.");
      contagemDeRenovacoes.total += 1;
      return json(sessao(usuario, geracaoDosTokens));
    }

    const usuario = usuarioDoCabecalho(cabecalhos.authorization ?? cabecalhos.Authorization);
    if (!usuario) return problema(401, "Autenticação é necessária para acessar este recurso.");
    const temPerfil = (perfis: string[]) => usuario.perfis.some((perfil) => perfis.includes(perfil));

    if (metodo === "GET" && caminho === "/auth/me") return json(comoNaApi(usuario));

    if (metodo === "GET" && caminho === "/api/admin/usuarios/opcoes") {
      if (!temPerfil(["ADMIN"])) return problema(403, "Você não tem permissão para acessar este recurso.");
      return json({ perfis: [], departamentos: [], organizacoes: [USUARIOS.fornecedor.organizacao] });
    }

    if (metodo === "GET" && caminho === "/api/solicitantes") {
      if (!temPerfil(PERFIS_QUE_ABREM_PELA_CENTRAL)) return problema(403, "Você não tem permissão para acessar este recurso.");
      const busca = (url.searchParams.get("busca") ?? "").toLowerCase();
      return json(Object.values(USUARIOS)
        .filter((candidato) => candidato.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil)))
        .filter((candidato) => `${candidato.nome} ${candidato.email}`.toLowerCase().includes(busca))
        .map((candidato) => ({ id: candidato.id, nome: candidato.nome, email: candidato.email, organizacao: candidato.organizacao?.nome ?? null })));
    }

    if (metodo === "POST" && caminho === "/api/chamados") {
      if (!temPerfil(PERFIS_QUE_ABREM)) return problema(403, "Você não tem permissão para acessar este recurso.");
      const pelaCentral = temPerfil(PERFIS_QUE_ABREM_PELA_CENTRAL) && (Boolean(dados.solicitanteId) || !temPerfil(PERFIS_DE_CLIENTE));
      const solicitante = pelaCentral
        ? Object.values(USUARIOS).find((candidato) => candidato.id === dados.solicitanteId && candidato.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil)))
        : usuario;
      if (!solicitante) {
        return problema(400, "Um ou mais campos são inválidos.", { solicitanteId: dados.solicitanteId ? "Selecione um cliente ativo como solicitante." : "Informe o cliente solicitante." });
      }
      const erros: Record<string, string> = {};
      if (!dados.cliente?.trim()) erros.cliente = "O nome do cliente é obrigatório.";
      if (!dados.modelo?.trim()) erros.modelo = "O modelo do veículo é obrigatório.";
      if (!dados.tipo?.trim()) erros.tipo = "O tipo do problema é obrigatório.";
      if (Object.keys(erros).length > 0) return problema(400, "Um ou mais campos são inválidos.", erros);
      contagem.aberturas += 1;
      const chamado: ChamadoArmazenado = {
        id: `VF-${String(chamados.length).padStart(4, "0")}`,
        cliente: dados.cliente.trim(),
        telefone: dados.telefone ?? "",
        modelo: dados.modelo.trim(),
        placa: (dados.placa ?? "").toUpperCase(),
        tipo: dados.tipo.trim(),
        prioridade: "Média",
        descricao: dados.descricao ?? "",
        localizacao: dados.localizacao ?? "",
        status: "Aberto",
        abertura: horarioDeSaoPaulo(agora()),
        solicitanteId: solicitante.id,
      };
      chamados.push(chamado);
      return json(detalhe(chamado), 201);
    }

    if (metodo === "GET" && caminho === "/api/chamados") {
      if (!temPerfil(PERFIS_QUE_LISTAM)) return problema(403, "Você não tem permissão para acessar este recurso.");
      const busca = url.searchParams.get("busca")?.toLowerCase();
      const page = Number(url.searchParams.get("page") ?? 0);
      const size = Number(url.searchParams.get("size") ?? 20);
      const encontrados = visiveisPara(usuario)
        .filter((chamado) => !busca || [chamado.id, chamado.cliente, chamado.modelo].some((campo) => campo.toLowerCase().includes(busca)))
        .sort((a, b) => b.abertura.localeCompare(a.abertura) || b.id.localeCompare(a.id));
      return json({
        content: encontrados.slice(page * size, (page + 1) * size).map(itemDaLista),
        page,
        size,
        totalElements: encontrados.length,
        totalPages: Math.ceil(encontrados.length / size),
      });
    }

    const consulta = /^\/api\/chamados\/([^/]+)$/.exec(caminho);
    if (metodo === "GET" && consulta) {
      if (!temPerfil(PERFIS_QUE_LISTAM)) return problema(403, "Você não tem permissão para acessar este recurso.");
      const chamado = visiveisPara(usuario).find((candidato) => candidato.id === decodeURIComponent(consulta[1]));
      return chamado ? json(detalhe(chamado)) : problema(404, `Chamado ${consulta[1]} não encontrado.`);
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
