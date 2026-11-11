"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChartColumn, CirclePlus, ClipboardList, Inbox, LayoutGrid, ListOrdered, Settings, Truck } from "lucide-react";
import MarcaViaFlux from "@/components/ui/MarcaViaFlux";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import {
  PERFIS_COM_VISAO_GLOBAL, PERFIS_DA_CENTRAL, PERFIS_DE_CLIENTE, PERFIS_DE_FORNECEDOR, PERFIS_DE_METRICAS, PERFIS_DE_TRIAGEM, PERFIS_QUE_ABREM_PELA_CENTRAL,
  usuarioTemPerfil,
} from "@/utils/perfis";
import { cn } from "@/utils/cn";

interface ItemDeMenu {
  href: string;
  rotulo: string;
  icone: ReactNode;
  ativo: (caminho: string) => boolean;
}

function ehTelaDeTriagem(caminho: string) {
  return caminho === "/triagem" || (caminho.startsWith("/chamados/") && caminho.endsWith("/triagem"));
}

function ehTelaDaCentral(caminho: string) {
  return caminho === "/" || (caminho.startsWith("/chamados/") && caminho !== "/chamados/novo" && !ehTelaDeTriagem(caminho));
}

export interface PerfisDoMenu {
  central: boolean;
  triagem: boolean;
  abrePelaCentral: boolean;
  global: boolean;
  metricas: boolean;
  cliente: boolean;
  fornecedor: boolean;
  admin: boolean;
}

export function itensDeMenuPara(perfis: PerfisDoMenu): ItemDeMenu[] {
  const itens: ItemDeMenu[] = [];
  if (perfis.central) itens.push({ href: "/", rotulo: perfis.global ? "Dashboard" : "Fila do departamento", icone: perfis.global ? <LayoutGrid size={20} /> : <ListOrdered size={20} />, ativo: ehTelaDaCentral });
  if (perfis.triagem) itens.push({ href: "/triagem", rotulo: "Classificação", icone: <ClipboardList size={20} />, ativo: ehTelaDeTriagem });
  if (perfis.abrePelaCentral && !perfis.cliente) itens.push({ href: "/chamados/novo", rotulo: "Novo Chamado", icone: <CirclePlus size={20} />, ativo: (caminho) => caminho === "/chamados/novo" });
  if (perfis.metricas) itens.push({ href: "/metricas", rotulo: "Métricas", icone: <ChartColumn size={20} />, ativo: (caminho) => caminho.startsWith("/metricas") });
  if (perfis.cliente) {
    itens.push({ href: "/portal", rotulo: "Meus chamados", icone: <Inbox size={20} />, ativo: (caminho) => caminho.startsWith("/portal") });
    itens.push({ href: "/chamados/novo", rotulo: "Novo Chamado", icone: <CirclePlus size={20} />, ativo: (caminho) => caminho === "/chamados/novo" });
  }
  if (perfis.fornecedor) itens.push({ href: "/fornecedor", rotulo: "Meus serviços", icone: <Truck size={20} />, ativo: (caminho) => caminho.startsWith("/fornecedor") });
  if (perfis.admin) itens.push({ href: "/usuarios", rotulo: "Configurações", icone: <Settings size={20} />, ativo: (caminho) => caminho.startsWith("/usuarios") || caminho.startsWith("/dev-tools") });
  return itens;
}

export function useItensDoMenu() {
  const usuario = useUsuarioAutenticado();
  return itensDeMenuPara({
    central: usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL),
    triagem: usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM),
    abrePelaCentral: usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_PELA_CENTRAL),
    global: usuarioTemPerfil(usuario, PERFIS_COM_VISAO_GLOBAL),
    metricas: usuarioTemPerfil(usuario, PERFIS_DE_METRICAS),
    cliente: usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE),
    fornecedor: usuarioTemPerfil(usuario, PERFIS_DE_FORNECEDOR),
    admin: usuarioTemPerfil(usuario, ["ADMIN"]),
  });
}

export default function Sidebar() {
  const caminho = usePathname();
  const itens = useItensDoMenu();

  return (
    <aside className="viaflux-trilho">
      <Link href="/" className="viaflux-trilho-marca" aria-label="ViaFlux Mobilidade · início">
        <MarcaViaFlux />
      </Link>
      <nav aria-label="Menu principal" className="viaflux-trilho-menu">
        {itens.map((item) => {
          const ativo = item.ativo(caminho);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn("viaflux-trilho-item alvo-toque", ativo && "viaflux-trilho-item-ativo")}
            >
              <span className="viaflux-trilho-icone" aria-hidden>{item.icone}</span>
              <span className="viaflux-trilho-rotulo">{item.rotulo}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
