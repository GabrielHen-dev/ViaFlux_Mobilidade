"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApi } from "@/store/AuthContext";
import type { Chamado, TipoChamado } from "@/types/chamado";
import type { FiltrosChamados, FiltrosMetricas } from "@/services/api/contratos";
import {
  type ClienteApi, consultarChamado, listarChamados, listarContextos, listarDepartamentos, listarLixeira, listarMotivos, resumirChamados,
} from "@/services/api/chamados";
import { consultarMetricas, listarFornecedores, listarNotificacoes, listarServicosDoFornecedor } from "@/services/api/operacao";

export const INTERVALO_DO_PAINEL_MS = 15_000;
const INTERVALO_DO_DETALHE_MS = 30_000;
const INTERVALO_DAS_NOTIFICACOES_MS = 30_000;

export const chaves = {
  chamados: ["chamados"] as const,
  lista: (filtros: FiltrosChamados) => ["chamados", "lista", filtros] as const,
  resumo: (filtros: object) => ["chamados", "resumo", filtros] as const,
  detalhe: (codigo: string) => ["chamados", "detalhe", codigo] as const,
  lixeira: ["chamados", "lixeira"] as const,
  motivos: ["classificacao", "motivos"] as const,
  contextos: (tipo: TipoChamado | null) => ["classificacao", "contextos", tipo] as const,
  departamentos: ["departamentos"] as const,
  fornecedores: ["fornecedores"] as const,
  servicosDoFornecedor: ["fornecedor", "servicos"] as const,
  notificacoes: ["notificacoes"] as const,
  metricas: (filtros: FiltrosMetricas) => ["metricas", filtros] as const,
};

export function invalidarListas(cliente: QueryClient) {
  return Promise.all([
    cliente.invalidateQueries({ queryKey: chaves.chamados, predicate: (consulta) => consulta.queryKey[1] !== "detalhe" }),
    cliente.invalidateQueries({ queryKey: chaves.notificacoes }),
  ]);
}

export function useListaDeChamados(filtros: FiltrosChamados, habilitada = true) {
  const api = useApi();
  return useQuery({
    queryKey: chaves.lista(filtros),
    queryFn: () => listarChamados(api, filtros),
    placeholderData: keepPreviousData,
    refetchInterval: INTERVALO_DO_PAINEL_MS,
    enabled: habilitada,
  });
}

export function useResumoDeChamados(filtros: Omit<FiltrosChamados, "page" | "size" | "ordenacao">, habilitada = true) {
  const api = useApi();
  return useQuery({
    queryKey: chaves.resumo(filtros),
    queryFn: () => resumirChamados(api, filtros),
    placeholderData: keepPreviousData,
    refetchInterval: INTERVALO_DO_PAINEL_MS,
    enabled: habilitada,
  });
}

export function useChamado(codigo: string) {
  const api = useApi();
  return useQuery({
    queryKey: chaves.detalhe(codigo),
    queryFn: () => consultarChamado(api, codigo),
    refetchInterval: INTERVALO_DO_DETALHE_MS,
  });
}

export function useMotivos() {
  const api = useApi();
  return useQuery({ queryKey: chaves.motivos, queryFn: () => listarMotivos(api), staleTime: Infinity });
}

export function useContextos(tipo: TipoChamado | null) {
  const api = useApi();
  return useQuery({
    queryKey: chaves.contextos(tipo),
    queryFn: () => listarContextos(api, tipo as TipoChamado),
    enabled: tipo !== null,
    staleTime: Infinity,
  });
}

export function useDepartamentos() {
  const api = useApi();
  return useQuery({ queryKey: chaves.departamentos, queryFn: () => listarDepartamentos(api), staleTime: Infinity });
}

export function useFornecedores() {
  const api = useApi();
  return useQuery({ queryKey: chaves.fornecedores, queryFn: () => listarFornecedores(api), staleTime: 5 * 60_000 });
}

export function useLixeira() {
  const api = useApi();
  return useQuery({ queryKey: chaves.lixeira, queryFn: () => listarLixeira(api) });
}

export function useServicosDoFornecedor() {
  const api = useApi();
  return useQuery({ queryKey: chaves.servicosDoFornecedor, queryFn: () => listarServicosDoFornecedor(api), refetchInterval: INTERVALO_DO_PAINEL_MS });
}

export function useNotificacoes() {
  const api = useApi();
  return useQuery({ queryKey: chaves.notificacoes, queryFn: () => listarNotificacoes(api), refetchInterval: INTERVALO_DAS_NOTIFICACOES_MS });
}

export function useMetricas(filtros: FiltrosMetricas) {
  const api = useApi();
  return useQuery({ queryKey: chaves.metricas(filtros), queryFn: () => consultarMetricas(api, filtros), placeholderData: keepPreviousData });
}

export function useAcaoNoChamado<Variaveis>(codigo: string, executar: (api: ClienteApi, variaveis: Variaveis) => Promise<Chamado>) {
  const api = useApi();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (variaveis: Variaveis) => executar(api, variaveis),
    onSuccess: (chamado) => {
      cliente.setQueryData(chaves.detalhe(codigo), chamado);
      void invalidarListas(cliente);
    },
  });
}
