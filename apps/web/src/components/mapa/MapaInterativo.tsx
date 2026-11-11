"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { ATRIBUICAO_DO_MAPA, ENDERECO_DOS_BLOCOS } from "@/components/mapa/configuracao";

export interface PontoNoMapa {
  id: string;
  latitude: number;
  longitude: number;
  cor?: string;
  rotulo?: string;
  quantidade?: number;
  aoClicar?: () => void;
}

export interface PropsDoMapa {
  latitude: number;
  longitude: number;
  zoom?: number;
  altura?: number;
  arrastavel?: boolean;
  aoMover?: (latitude: number, longitude: number) => void;
  pontos?: PontoNoMapa[];
  rotulo: string;
}

function iconeDoPino(cor: string) {
  return L.divIcon({
    className: "",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    html: `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 1C6.4 1 1 6.3 1 12.9 1 22 13 33 13 33s12-11 12-20.1C25 6.3 19.6 1 13 1z" fill="${cor}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4.5" fill="#fff"/></svg>`,
  });
}

function iconeDoGrupo(cor: string, quantidade: number) {
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:${cor};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);color:#fff;font:600 12px Roboto,sans-serif">${quantidade}</div>`,
  });
}

function AcompanharCentro({ latitude, longitude }: { latitude: number; longitude: number }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView([latitude, longitude], mapa.getZoom(), { animate: false });
  }, [mapa, latitude, longitude]);
  return null;
}

function EnquadrarPontos({ pontos }: { pontos: PontoNoMapa[] }) {
  const mapa = useMap();
  const chave = pontos.map((ponto) => `${ponto.id}:${ponto.latitude}:${ponto.longitude}`).join("|");
  useEffect(() => {
    if (pontos.length < 2) return;
    mapa.fitBounds(L.latLngBounds(pontos.map((ponto) => [ponto.latitude, ponto.longitude] as [number, number])), { padding: [32, 32], maxZoom: 15 });
  }, [mapa, chave, pontos]);
  return null;
}

export default function MapaInterativo({ latitude, longitude, zoom = 15, altura = 220, arrastavel = false, aoMover, pontos, rotulo }: PropsDoMapa) {
  const iconePrincipal = useMemo(() => iconeDoPino("#0B2545"), []);

  return (
    <div role="region" aria-label={rotulo} className="overflow-hidden rounded border border-linha" style={{ height: altura }}>
      <MapContainer center={[latitude, longitude]} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url={ENDERECO_DOS_BLOCOS} attribution={ATRIBUICAO_DO_MAPA} />
        {pontos ? (
          <>
            <EnquadrarPontos pontos={pontos} />
            {pontos.map((ponto) => (
              <Marker
                key={ponto.id}
                position={[ponto.latitude, ponto.longitude]}
                icon={(ponto.quantidade ?? 1) > 1 ? iconeDoGrupo(ponto.cor ?? "#0B2545", ponto.quantidade ?? 1) : iconeDoPino(ponto.cor ?? "#0B2545")}
                title={ponto.rotulo}
                eventHandlers={ponto.aoClicar ? { click: ponto.aoClicar } : undefined}
              />
            ))}
          </>
        ) : (
          <>
            <AcompanharCentro latitude={latitude} longitude={longitude} />
            <Marker
              position={[latitude, longitude]}
              icon={iconePrincipal}
              draggable={arrastavel}
              eventHandlers={arrastavel && aoMover ? {
                dragend: (evento) => {
                  const posicao = (evento.target as L.Marker).getLatLng();
                  aoMover(posicao.lat, posicao.lng);
                },
              } : undefined}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
