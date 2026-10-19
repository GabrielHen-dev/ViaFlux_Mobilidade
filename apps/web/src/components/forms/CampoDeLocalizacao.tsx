"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import type { Localizacao } from "@/types/chamado";

const TEMPO_LIMITE_GPS_MS = 15_000;

const MENSAGEM_DO_ERRO_DE_GPS: Record<number, string> = {
  1: "Permissão de localização negada. Informe o endereço manualmente.",
  2: "Não foi possível obter a posição do aparelho. Informe o endereço manualmente.",
  3: "O GPS demorou para responder. Tente de novo ou informe o endereço.",
};

export function descreverCoordenadas(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

interface Props {
  id: string;
  valor: Localizacao;
  aoAlterar: (localizacao: Localizacao) => void;
  inputClassName: string;
  erro?: string;
}

export default function CampoDeLocalizacao({ id, valor, aoAlterar, inputClassName, erro }: Props) {
  const [buscando, setBuscando] = useState(false);
  const [falhaDoGps, setFalhaDoGps] = useState("");

  function usarGps() {
    if (!("geolocation" in navigator)) {
      setFalhaDoGps("Este navegador não oferece localização. Informe o endereço manualmente.");
      return;
    }
    setBuscando(true);
    setFalhaDoGps("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBuscando(false);
        const coordenadas = descreverCoordenadas(coords.latitude, coords.longitude);
        aoAlterar({ endereco: valor.endereco.trim() || coordenadas, latitude: coords.latitude, longitude: coords.longitude });
      },
      (falha) => {
        setBuscando(false);
        setFalhaDoGps(MENSAGEM_DO_ERRO_DE_GPS[falha.code] ?? MENSAGEM_DO_ERRO_DE_GPS[2]);
      },
      { enableHighAccuracy: true, timeout: TEMPO_LIMITE_GPS_MS },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          className={inputClassName}
          placeholder="Ex: BR-116, km 312, Guarulhos – SP"
          value={valor.endereco}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : undefined}
          onChange={(evento) => aoAlterar({ endereco: evento.target.value, latitude: null, longitude: null })}
        />
        <button
          type="button"
          onClick={usarGps}
          disabled={buscando}
          className="alvo-toque inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-blue transition hover:bg-blue-50 disabled:opacity-50"
        >
          <LocateFixed size={14} aria-hidden />
          {buscando ? "Localizando…" : "Usar minha localização"}
        </button>
      </div>
      {valor.latitude !== null && valor.longitude !== null && (
        <p className="text-xs text-emerald-700">GPS registrado: {descreverCoordenadas(valor.latitude, valor.longitude)}</p>
      )}
      {erro && <p id={`${id}-erro`} className="text-xs font-medium text-red-600">{erro}</p>}
      {falhaDoGps && <p role="alert" className="text-xs font-medium text-amber-700">{falhaDoGps}</p>}
    </div>
  );
}
