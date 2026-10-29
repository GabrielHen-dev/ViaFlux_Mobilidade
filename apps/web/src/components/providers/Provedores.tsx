"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import CaixaDeAvisos from "@/components/ui/CaixaDeAvisos";

const TENTATIVAS_EM_FALHA_DE_REDE = 2;

function deveTentarDeNovo(falhas: number, erro: Error) {
  if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false;
  return falhas < TENTATIVAS_EM_FALHA_DE_REDE;
}

export function criarClienteDeConsultas() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveTentarDeNovo, staleTime: 5_000, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  });
}

export default function Provedores({ children }: { children: ReactNode }) {
  const [clienteDeConsultas] = useState(criarClienteDeConsultas);
  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <AuthProvider>{children}</AuthProvider>
      <CaixaDeAvisos />
    </QueryClientProvider>
  );
}
