"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIXO = "viaflux.rascunho.";

function ler<T>(chave: string): T | null {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: unknown) {
  try { window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor)); } catch { }
}

function apagar(chave: string) {
  try { window.localStorage.removeItem(PREFIXO + chave); } catch { }
}

export function useRascunho<T>(chave: string, inicial: T) {
  const [valor, setValorInterno] = useState<T>(inicial);
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    const salvo = ler<T>(chave);
    if (salvo === null) return;
    queueMicrotask(() => {
      setValorInterno(salvo);
      setRestaurado(true);
    });
  }, [chave]);

  const setValor = useCallback((atualizacao: T | ((anterior: T) => T)) => {
    setValorInterno((anterior) => {
      const proximo = typeof atualizacao === "function" ? (atualizacao as (anterior: T) => T)(anterior) : atualizacao;
      gravar(chave, proximo);
      return proximo;
    });
  }, [chave]);

  const descartar = useCallback((proximo: T) => {
    apagar(chave);
    setValorInterno(proximo);
    setRestaurado(false);
  }, [chave]);

  return { valor, setValor, restaurado, descartar };
}
