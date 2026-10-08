"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { entrar as entrarNaApi, renovarSessao } from "@/services/api/auth";
import { ErroApi } from "@/services/api/cliente";
import type { Sessao, UsuarioAutenticado } from "@/types/auth";

type EstadoAuth =
  | { status: "verificando" }
  | { status: "anonimo" }
  | { status: "autenticado"; usuario: UsuarioAutenticado; accessToken: string };

interface AuthContextValue {
  estado: EstadoAuth;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const CHAVE_REFRESH_TOKEN = "viaflux.refreshToken";

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

async function restaurarSessao(): Promise<Sessao | null> {
  const refreshToken = lerRefreshToken();
  if (!refreshToken) return null;
  try {
    return await renovarSessao(refreshToken);
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 401) removerRefreshToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({ status: "verificando" });

  const aplicarSessao = useCallback((sessao: Sessao) => {
    gravarRefreshToken(sessao.refreshToken);
    setEstado({ status: "autenticado", usuario: sessao.usuario, accessToken: sessao.accessToken });
  }, []);

  useEffect(() => {
    let montado = true;
    restaurarSessao().then((sessao) => {
      if (!montado) return;
      if (sessao) aplicarSessao(sessao);
      else setEstado({ status: "anonimo" });
    });
    return () => { montado = false; };
  }, [aplicarSessao]);

  const entrar = useCallback(async (email: string, senha: string) => {
    aplicarSessao(await entrarNaApi(email, senha));
  }, [aplicarSessao]);

  const sair = useCallback(() => {
    removerRefreshToken();
    setEstado({ status: "anonimo" });
  }, []);

  return <AuthContext.Provider value={{ estado, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa de AuthProvider");
  return context;
}

export function useUsuarioAutenticado() {
  const { estado } = useAuth();
  if (estado.status !== "autenticado") throw new Error("useUsuarioAutenticado precisa estar dentro de AreaProtegida");
  return estado.usuario;
}
