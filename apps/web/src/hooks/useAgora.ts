"use client";

import { useEffect, useState } from "react";

const INTERVALO_PADRAO_MS = 1_000;

export function useAgora(intervaloMs = INTERVALO_PADRAO_MS) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), intervaloMs);
    return () => clearInterval(relogio);
  }, [intervaloMs]);
  return agora;
}
