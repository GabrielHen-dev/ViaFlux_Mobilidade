import { transportar } from "@/services/api/transporte";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8281").replace(/\/$/, "");

export const STATUS_SEM_CONEXAO = 0;

export class ErroApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly campos: Record<string, string> = {},
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }

  get semConexao() {
    return this.status === STATUS_SEM_CONEXAO;
  }
}

async function enviar(caminho: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let resposta: Response;
  try {
    resposta = await transportar(`${API_URL}${caminho}`, { ...init, headers });
  } catch {
    throw new ErroApi(STATUS_SEM_CONEXAO, "Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.");
  }
  if (!resposta.ok) throw await erroDaResposta(resposta);
  return resposta;
}

export async function requisitarApi<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await enviar(caminho, init);
  if (resposta.status === 204) return undefined as T;
  const tipoConteudo = resposta.headers.get("Content-Type") ?? "";
  if (!tipoConteudo.includes("json")) return (await resposta.text()) as T;
  return (await resposta.json()) as T;
}

export async function requisitarArquivo(caminho: string, init: RequestInit = {}): Promise<Blob> {
  const resposta = await enviar(caminho, init);
  return resposta.blob();
}

async function erroDaResposta(resposta: Response) {
  const corpo = (await resposta.json().catch(() => null)) as { detail?: string; errors?: Record<string, string> } | null;
  return new ErroApi(resposta.status, corpo?.detail || `A API respondeu com erro ${resposta.status}.`, corpo?.errors ?? {});
}
