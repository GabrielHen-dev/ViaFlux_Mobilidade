const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8281").replace(/\/$/, "");

export const STATUS_SEM_CONEXAO = 0;

export class ErroApi extends Error {
  constructor(public readonly status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export async function requisitarApi<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  } catch {
    throw new ErroApi(STATUS_SEM_CONEXAO, "Não foi possível conectar ao servidor. Verifique se a API está em execução.");
  }
  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDoErro(resposta));
  return (await resposta.json()) as T;
}

async function mensagemDoErro(resposta: Response) {
  const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
  return corpo?.detail || `A API respondeu com erro ${resposta.status}.`;
}
