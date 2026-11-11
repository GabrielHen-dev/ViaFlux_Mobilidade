"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Plus, Search } from "lucide-react";
import Notificacoes from "@/components/layout/Notificacoes";
import { useItensDoMenu } from "@/components/layout/Sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
import { useAuth, useUsuarioAutenticado } from "@/store/AuthContext";
import { PERFIS_DA_CENTRAL, PERFIS_QUE_ABREM_CHAMADO, usuarioTemPerfil } from "@/utils/perfis";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

function secaoAtual(caminho: string, rotuloDoMenu: string | undefined) {
  if (/^\/(portal\/)?chamados\/[^/]+/.test(caminho) && caminho !== "/chamados/novo") return `Chamado ${caminho.split("/").filter(Boolean)[caminho.startsWith("/portal") ? 2 : 1]}`;
  if (rotuloDoMenu) return rotuloDoMenu;
  return "ViaFlux";
}

function BuscaGlobal() {
  const router = useRouter();
  const [termo, setTermo] = useState("");

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const busca = termo.trim();
    router.push(busca ? `/?busca=${encodeURIComponent(busca)}` : "/");
  }

  return (
    <form role="search" onSubmit={buscar} className="hidden min-w-0 max-w-sm flex-1 items-center md:flex">
      <label htmlFor="busca-global" className="sr-only">Busca global de chamados</label>
      <div className="relative w-full">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-apagada" aria-hidden />
        <input
          id="busca-global"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Buscar protocolo, cliente ou veículo"
          className="h-8 w-full rounded border border-linha bg-fundo pl-8 pr-3 text-sm text-tinta outline-none placeholder:text-tinta-apagada focus:bg-white"
        />
      </div>
    </form>
  );
}

export default function Topo() {
  const caminho = usePathname();
  const { sair } = useAuth();
  const usuario = useUsuarioAutenticado();
  const itens = useItensDoMenu();
  const ativo = itens.find((item) => item.ativo(caminho));
  const perfis = usuario.perfis.map((perfil) => perfil.descricao).join(" · ");
  const daCentral = usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL);
  const podeAbrir = usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_CHAMADO);

  return (
    <header className="viaflux-topo">
      <div className="viaflux-topo-aba">
        <span className="truncate">{secaoAtual(caminho, ativo?.rotulo)}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 px-3">
        {daCentral && <BuscaGlobal />}
        {podeAbrir && caminho !== "/chamados/novo" && (
          <Link href="/chamados/novo" className="vf-botao-primario alvo-toque hidden h-8 items-center gap-1.5 px-3 sm:inline-flex">
            <Plus size={14} aria-hidden /> Novo chamado
          </Link>
        )}
        <Notificacoes />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Menu do usuário" className="alvo-toque flex items-center gap-2 rounded px-1.5 py-1 hover:bg-fundo">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-medium text-white" aria-hidden>{iniciais(usuario.nome)}</span>
            <span className="hidden max-w-40 truncate text-xs font-medium text-tinta lg:block" aria-hidden>{usuario.nome}</span>
            <ChevronDown size={14} className="text-tinta-apagada" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-medium text-tinta">{usuario.nome}</span>
              <span className="block truncate">{usuario.email}</span>
              <span className="mt-1 block truncate">{perfis}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={sair}>
              <LogOut size={15} aria-hidden /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
