import type { EnderecoEncontrado } from "@/types/chamado";
import { type ClienteApi, paraConsulta } from "@/services/api/chamados";

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export function buscarPorCep(api: ClienteApi, cep: string) {
  return api.requisitar<EnderecoEncontrado>(`/api/enderecos/cep/${encodeURIComponent(cep.replace(/\D/g, ""))}`);
}

export function buscarPorCoordenadas(api: ClienteApi, latitude: number, longitude: number) {
  return api.requisitar<EnderecoEncontrado>(`/api/enderecos/reverso${paraConsulta({ latitude, longitude })}`);
}

export function buscarEnderecos(api: ClienteApi, termo: string, coordenadas?: Coordenadas | null) {
  const filtros = { q: termo.trim(), latitude: coordenadas?.latitude, longitude: coordenadas?.longitude };
  return api.requisitar<EnderecoEncontrado[]>(`/api/enderecos/busca${paraConsulta(filtros)}`);
}
