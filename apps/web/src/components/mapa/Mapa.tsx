"use client";

import dynamic from "next/dynamic";
import type { PropsDoMapa } from "@/components/mapa/MapaInterativo";

export type { PontoNoMapa, PropsDoMapa } from "@/components/mapa/MapaInterativo";

const MapaInterativo = dynamic(() => import("@/components/mapa/MapaInterativo"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-32 items-center justify-center rounded border border-linha bg-fundo text-xs text-tinta-apagada">Carregando mapa…</div>,
});

export default function Mapa(props: PropsDoMapa) {
  return <MapaInterativo {...props} />;
}
