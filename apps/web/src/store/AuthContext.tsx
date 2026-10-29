"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { entrar as entrarNaApi, renovarSessao } from "@/services/api/auth";
import { ErroApi, requisitarApi, requisitarArquivo } from "@/services/api/cliente";
import type { ClienteApi } from "@/services/api/chamados";
import type { Sessao, UsuarioAutenticado } from "@/types/auth";
import { limparRascunhosLocais } from "@/hooks/useRascunho";

type EstadoAuth =
  | { status: "verificando" }
  | { status: "anonimo" }
  | { status: "autenticado"; usuario: UsuarioAutenticado; accessToken: string };

interface AuthContextValue {
  estado: EstadoAuth;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
  atualizarUsuario: () => Promise<void>;
  api: ClienteApi;
}

interface TokensDaSessao {
  accessToken: string;
  refreshToken: string;
  expiraEm: number;
}

const CHAVE_REFRESH_TOKEN = "viaflux.refreshToken";
const ANTECEDENCIA_DA_RENOVACAO_MS = 60_000;
const VALIDADE_MINIMA_PARA_USO_MS = 10_000;

const AuthContext = createContext<AuthContextValue | null>(null);

function lerRefreshToken() {
  try { return window.localStorage.getItem(CHAVE_REFRESH_TOKEN); } catch { return null; }
}

function gravarRefreshToken(refreshToken: string) {
  try { window.localStorage.setItem(CHAVE_REFRESH_TOKEN, refreshToken); } catch { }
}

function removerRefreshToken() {
  try { window.localStorage.removeItem(CHAVE_REFRESH_TOKEN); } catch { }
}

function comAutorizacao(init: RequestInit, accessToken: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return { ...init, headers };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clienteDeConsultas = useQueryClient();
  const [estado, setEstado] = useState<EstadoAuth>({ status: "verificando" });
  const tokens = useRef<TokensDaSessao | null>(null);
  const identidadeAtual = useRef<string | null>(null);
  const renovacaoEmCurso = useRef<Promise<string | null> | null>(null);

  const aplicarSessao = useCallback((sessao: Sessao) => {
    if (identidadeAtual.current !== null && identidadeAtual.current !== sessao.usuario.id) {
      clienteDeConsultas.clear();
      limparRascunhosLocais();
    }
    identidadeAtual.current = sessao.usuario.id;
    gravarRefreshToken(sessao.refreshToken);
    tokens.current = { accessToken: sessao.accessToken, refreshToken: sessao.refreshToken, expiraEm: Date.now() + sessao.expiresIn * 1000 };
    setEstado({ status: "autenticado", usuario: sessao.usuario, accessToken: sessao.accessToken });
  }, [clienteDeConsultas]);

  const sair = useCallback(() => {
    removerRefreshToken();
    limparRascunhosLocais();
    tokens.current = null;
    identidadeAtual.current = null;
    clienteDeConsultas.clear();
    setEstado({ status: "anonimo" });
  }, [clienteDeConsultas]);

  const renovar = useCallback((): Promise<string | null> => {
    if (renovacaoEmCurso.current) return renovacaoEmCurso.current;
    const refreshToken = tokens.current?.refreshToken ?? lerRefreshToken();
    if (!refreshToken) return Promise.resolve(null);
    const renovacao = renovarSessao(refreshToken)
      .then((sessao) => {
        aplicarSessao(sessao);
        return sessao.accessToken;
      })
      .catch((erro: unknown) => {
        if (erro instanceof ErroApi && erro.status === 401) sair();
        return null;
      })
      .finally(() => { renovacaoEmCurso.current = null; });
    renovacaoEmCurso.current = renovacao;
    return renovacao;
  }, [aplicarSessao, sair]);

  useEffect(() => {
    let montado = true;
    if (!lerRefreshToken()) {
      queueMicrotask(() => { if (montado) setEstado({ status: "anonimo" }); });
      return () => { montado = false; };
    }
    renovar().then((accessToken) => {
      if (montado && !accessToken) setEstado({ status: "anonimo" });
    });
    return () => { montado = false; };
  }, [renovar]);

  useEffect(() => {
    if (estado.status !== "autenticado" || !tokens.current) return;
    const espera = Math.max(0, tokens.current.expiraEm - Date.now() - ANTECEDENCIA_DA_RENOVACAO_MS);
    const agendamento = setTimeout(() => { void renovar(); }, espera);
    return () => clearTimeout(agendamento);
  }, [estado, renovar]);

  const tokenValido = useCallback(async () => {
    const atuais = tokens.current;
    if (!atuais) return null;
    if (atuais.expiraEm - Date.now() > VALIDADE_MINIMA_PARA_USO_MS) return atuais.accessToken;
    return renovar();
  }, [renovar]);

  const api = useMemo<ClienteApi>(() => {
    async function autenticado<T>(executar: (init: RequestInit) => Promise<T>, init: RequestInit) {
      const accessToken = await tokenValido();
      try {
        return await executar(comAutorizacao(init, accessToken));
      } catch (erro) {
        if (!(erro instanceof ErroApi && erro.status === 401)) throw erro;
        const renovado = await renovar();
        if (!renovado) throw erro;
        return executar(comAutorizacao(init, renovado));
      }
    }
    return {
      requisitar: <T,>(caminho: string, init: RequestInit = {}) => autenticado((comToken) => requisitarApi<T>(caminho, comToken), init),
      baixar: (caminho: string, init: RequestInit = {}) => autenticado((comToken) => requisitarArquivo(caminho, comToken), init),
    };
  }, [tokenValido, renovar]);

  const entrar = useCallback(async (email: string, senha: string) => {
    aplicarSessao(await entrarNaApi(email, senha));
  }, [aplicarSessao]);

  const atualizarUsuario = useCallback(async () => {
    const usuario = await api.requisitar<UsuarioAutenticado>("/auth/me");
    setEstado((atual) => atual.status === "autenticado" && atual.usuario.id === usuario.id ? { ...atual, usuario } : atual);
  }, [api]);

  return <AuthContext.Provider value={{ estado, entrar, sair, atualizarUsuario, api }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa de AuthProvider");
  return context;
}

export function useApi() {
  return useAuth().api;
}

export function useUsuarioAutenticado() {
  const { estado } = useAuth();
  if (estado.status !== "autenticado") throw new Error("useUsuarioAutenticado precisa estar dentro de AreaProtegida");
  return estado.usuario;
}
