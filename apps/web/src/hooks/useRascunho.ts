"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIXO = "viaflux.rascunho.";
const RETENCAO_MAXIMA_MS = 24 * 60 * 60 * 1000;

interface Envelope<T> { salvoEm: number; valor: T }
const PRESERVAR = <T,>(valor: T) => valor;

function ler<T>(chave: string): { valor: T; salvoEm: number } | null {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;
    const envelope = JSON.parse(bruto) as Envelope<T>;
    if (typeof envelope.salvoEm !== "number" || Date.now() - envelope.salvoEm > RETENCAO_MAXIMA_MS) {
      window.localStorage.removeItem(PREFIXO + chave);
      return null;
    }
    return { valor: envelope.valor, salvoEm: envelope.salvoEm };
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  const salvoEm = Date.now();
  try { window.localStorage.setItem(PREFIXO + chave, JSON.stringify({ salvoEm, valor })); } catch { }
  return salvoEm;
}

function apagar(chave: string) {
  try { window.localStorage.removeItem(PREFIXO + chave); } catch { }
}

export function limparRascunhosLocais() {
  try {
    for (let indice = window.localStorage.length - 1; indice >= 0; indice -= 1) {
      const chave = window.localStorage.key(indice);
      if (chave?.startsWith(PREFIXO)) window.localStorage.removeItem(chave);
    }
  } catch { }
}

export function useRascunho<T>(chave: string, inicial: T, sanitizar: (valor: T) => T = PRESERVAR) {
  const [estado, setEstado] = useState<{ chave: string; valor: T; restaurado: boolean; expiraEm: number | null }>({ chave, valor: inicial, restaurado: false, expiraEm: null });
  const valor = estado.chave === chave ? estado.valor : inicial;
  const restaurado = estado.chave === chave && estado.restaurado;

  useEffect(() => {
    const salvo = ler<T>(chave);
    setEstado({ chave, valor: salvo === null ? inicial : sanitizar(salvo.valor), restaurado: salvo !== null, expiraEm: salvo === null ? null : salvo.salvoEm + RETENCAO_MAXIMA_MS });
  }, [chave, inicial, sanitizar]);

  useEffect(() => {
    if (estado.chave !== chave || estado.expiraEm === null) return;
    const temporizador = window.setTimeout(() => {
      apagar(chave);
      setEstado((atual) => atual.chave === chave && atual.expiraEm === estado.expiraEm
        ? { chave, valor: inicial, restaurado: false, expiraEm: null }
        : atual);
    }, Math.max(0, estado.expiraEm - Date.now()));
    return () => window.clearTimeout(temporizador);
  }, [chave, estado.chave, estado.expiraEm, inicial]);

  const setValor = useCallback((atualizacao: T | ((anterior: T) => T)) => {
    setEstado((atual) => {
      const anterior = atual.chave === chave ? atual.valor : inicial;
      const proximo = typeof atualizacao === "function" ? (atualizacao as (anterior: T) => T)(anterior) : atualizacao;
      const salvoEm = gravar(chave, sanitizar(proximo));
      return { chave, valor: proximo, restaurado: atual.chave === chave && atual.restaurado, expiraEm: salvoEm + RETENCAO_MAXIMA_MS };
    });
  }, [chave, inicial, sanitizar]);

  const descartar = useCallback((proximo: T) => {
    apagar(chave);
    setEstado({ chave, valor: proximo, restaurado: false, expiraEm: null });
  }, [chave]);

  return { valor, setValor, restaurado, descartar };
}
