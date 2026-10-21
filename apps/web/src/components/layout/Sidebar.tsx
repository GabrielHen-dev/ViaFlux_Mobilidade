"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChartColumn, CirclePlus, ClipboardList, Inbox, LayoutGrid, ListOrdered, LogOut, Trash, Truck, Users } from "lucide-react";
import MarcaViaFlux from "@/components/ui/MarcaViaFlux";
import Notificacoes from "@/components/layout/Notificacoes";
import { useAuth, useUsuarioAutenticado } from "@/store/AuthContext";
import {
  PERFIS_COM_VISAO_GLOBAL, PERFIS_DA_CENTRAL, PERFIS_DA_LIXEIRA, PERFIS_DE_CLIENTE, PERFIS_DE_FORNECEDOR, PERFIS_DE_METRICAS, PERFIS_DE_TRIAGEM, PERFIS_QUE_ABREM_PELA_CENTRAL,
  usuarioTemPerfil,
} from "@/utils/perfis";

interface ItemDeMenu {
  href: string;
  rotulo: string;
  icone: ReactNode;
  ativo: (caminho: string) => boolean;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
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
  if (perfis.central) itens.push({ href: "/", rotulo: perfis.global ? "Dashboard" : "Fila do departamento", icone: perfis.global ? <LayoutGrid size={18} /> : <ListOrdered size={18} />, ativo: ehTelaDaCentral });
  if (perfis.triagem) itens.push({ href: "/triagem", rotulo: "Triagem", icone: <ClipboardList size={18} />, ativo: ehTelaDeTriagem });
  if (perfis.abrePelaCentral && !perfis.cliente) itens.push({ href: "/chamados/novo", rotulo: "Novo Chamado", icone: <CirclePlus size={18} />, ativo: (caminho) => caminho === "/chamados/novo" });
  if (perfis.metricas) itens.push({ href: "/metricas", rotulo: "Métricas", icone: <ChartColumn size={18} />, ativo: (caminho) => caminho.startsWith("/metricas") });
  if (perfis.cliente) {
    itens.push({ href: "/portal", rotulo: "Meus chamados", icone: <Inbox size={18} />, ativo: (caminho) => caminho.startsWith("/portal") });
    itens.push({ href: "/chamados/novo", rotulo: "Novo Chamado", icone: <CirclePlus size={18} />, ativo: (caminho) => caminho === "/chamados/novo" });
  }
  if (perfis.fornecedor) itens.push({ href: "/fornecedor", rotulo: "Meus serviços", icone: <Truck size={18} />, ativo: (caminho) => caminho.startsWith("/fornecedor") });
  if (perfis.admin) itens.push({ href: "/usuarios", rotulo: "Usuários", icone: <Users size={18} />, ativo: (caminho) => caminho.startsWith("/usuarios") });
  return itens;
}

export default function Sidebar() {
  const caminho = usePathname();
  const { sair } = useAuth();
  const usuario = useUsuarioAutenticado();
  const comVisaoGlobal = usuarioTemPerfil(usuario, PERFIS_COM_VISAO_GLOBAL);
  const usaLixeira = usuarioTemPerfil(usuario, PERFIS_DA_LIXEIRA);
  const itens = itensDeMenuPara({
    central: usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL),
    triagem: usuarioTemPerfil(usuario, PERFIS_DE_TRIAGEM),
    abrePelaCentral: usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_PELA_CENTRAL),
    global: comVisaoGlobal,
    metricas: usuarioTemPerfil(usuario, PERFIS_DE_METRICAS),
    cliente: usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE),
    fornecedor: usuarioTemPerfil(usuario, PERFIS_DE_FORNECEDOR),
    admin: usuarioTemPerfil(usuario, ["ADMIN"]),
  });
  const perfis = usuario.perfis.map((perfil) => perfil.descricao).join(" · ");
  const naLixeira = caminho === "/lixeira";

  return (
    <aside className="viaflux-sidebar fixed left-0 top-0 z-20 flex h-full w-56 flex-col" style={{ background: "var(--brand-navy)" }}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <MarcaViaFlux />
          <div>
            <div className="font-display text-sm font-bold leading-tight text-white">ViaFlux</div>
            <div className="text-xs leading-tight text-brand-green">Mobilidade</div>
          </div>
        </div>
        <span className="sidebar-sino-topo"><Notificacoes /></span>
      </div>

      <nav aria-label="Menu principal" className="flex flex-1 flex-col px-3 py-4">
        <div className="sidebar-menu-label mb-3 px-2 font-display text-xs font-semibold uppercase tracking-widest text-white/35">Menu</div>
        <div className="sidebar-links space-y-1">
          {itens.map((item) => {
            const ativo = item.ativo(caminho);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className="alvo-toque flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
                style={{
                  background: ativo ? "rgba(37,99,235,0.25)" : "transparent",
                  color: ativo ? "#fff" : "rgba(255,255,255,0.6)",
                  borderLeft: ativo ? "3px solid #10B981" : "3px solid transparent",
                }}
              >
                <span style={{ color: ativo ? "#10B981" : "rgba(255,255,255,0.5)" }} aria-hidden>{item.icone}</span>
                {item.rotulo}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {usaLixeira && (
          <div className="sidebar-trash border-t border-white/10 pt-3">
            <Link
              href="/lixeira"
              aria-current={naLixeira ? "page" : undefined}
              className="alvo-toque flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              style={{
                background: naLixeira ? "rgba(220,38,38,0.2)" : "transparent",
                color: naLixeira ? "#FCA5A5" : "rgba(255,255,255,0.45)",
                borderLeft: naLixeira ? "3px solid #EF4444" : "3px solid transparent",
              }}
            >
              <Trash size={18} aria-hidden />
              Lixeira
            </Link>
          </div>
        )}
      </nav>

      <div className="sidebar-user border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #2563EB, #10B981)" }}>
            {iniciais(usuario.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white" title={usuario.email}>{usuario.nome}</div>
            <div className="truncate text-xs text-brand-green">{perfis}</div>
          </div>
          <button type="button" onClick={sair} aria-label="Sair" title="Sair" className="alvo-toque flex items-center justify-center text-white/40 transition-colors hover:text-white/70">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
