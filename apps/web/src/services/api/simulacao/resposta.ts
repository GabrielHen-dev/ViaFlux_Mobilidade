export class RespostaAntecipada extends Error {
  constructor(public readonly resposta: Response) {
    super(`Resposta antecipada com status ${resposta.status}`);
  }
}

export function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

export function semConteudo() {
  return new Response(null, { status: 204 });
}

export function problema(status: number, detail: string, errors?: Record<string, string>) {
  return new Response(JSON.stringify({ status, detail, ...(errors ? { errors } : {}) }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export function recusar(status: number, detail: string, errors?: Record<string, string>): never {
  throw new RespostaAntecipada(problema(status, detail, errors));
}
