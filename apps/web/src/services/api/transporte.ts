import { simularEndpointsPendentes } from "@/services/api/simulacao/roteador";

export type Transporte = (url: string, init: RequestInit) => Promise<Response>;

const viaRede: Transporte = (url, init) => fetch(url, init);

const simulacaoAtiva = process.env.NEXT_PUBLIC_SIMULAR_ENDPOINTS_PENDENTES !== "false";

export const transportar: Transporte = simulacaoAtiva ? simularEndpointsPendentes(viaRede) : viaRede;
