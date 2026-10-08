"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, LayoutGrid, LogOut, Trash } from "lucide-react";
import MarcaViaFlux from "@/components/ui/MarcaViaFlux";
import { useChamados } from "@/store/ChamadosContext";
import { useAuth, useUsuarioAutenticado } from "@/store/AuthContext";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lixeira } = useChamados();
  const { sair } = useAuth();
  const usuario = useUsuarioAutenticado();
  const perfis = usuario.perfis.map((perfil) => perfil.descricao).join(" · ");
  const lixeiraCount = lixeira.length;
  const navItems = [
    {
      id: "dashboard", href: "/",
      label: "Dashboard",
      icon: <LayoutGrid size={18} />,
    },
    {
      id: "novo", href: "/chamados/novo",
      label: "Novo Chamado",
      icon: <CirclePlus size={18} />,
    },
  ];

  return (
    <aside className="viaflux-sidebar fixed top-0 left-0 h-full w-56 flex flex-col z-20" style={{ background: "var(--brand-navy)" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <MarcaViaFlux />
          <div>
            <div className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
              ViaFlux
            </div>
            <div className="text-xs leading-tight" style={{ color: "#10B981" }}>
              Mobilidade
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Menu principal" className="flex-1 px-3 py-4 flex flex-col">
        <div className="sidebar-menu-label text-xs font-semibold uppercase tracking-widest mb-3 px-2" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
          Menu
        </div>
        <div className="sidebar-links space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === "novo" ? pathname === item.href : pathname === "/" || (pathname.startsWith("/chamados/") && pathname !== "/chamados/novo");
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: isActive ? "rgba(37,99,235,0.25)" : "transparent",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                  borderLeft: isActive ? "3px solid #10B981" : "3px solid transparent",
                }}
              >
                <span style={{ color: isActive ? "#10B981" : "rgba(255,255,255,0.5)" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Lixeira */}
        <div className="sidebar-trash border-t border-white/10 pt-3">
          <Link
            href="/lixeira"
            aria-current={pathname === "/lixeira" ? "page" : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: pathname === "/lixeira" ? "rgba(220,38,38,0.2)" : "transparent",
              color: pathname === "/lixeira" ? "#FCA5A5" : "rgba(255,255,255,0.45)",
              borderLeft: pathname === "/lixeira" ? "3px solid #EF4444" : "3px solid transparent",
            }}
          >
            <span style={{ color: pathname === "/lixeira" ? "#EF4444" : "rgba(255,255,255,0.35)" }}>
              <Trash size={18} />
            </span>
            <span className="flex-1 text-left">Lixeira</span>
            {lixeiraCount > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(220,38,38,0.3)", color: "#FCA5A5" }}
              >
                {lixeiraCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="sidebar-user px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #2563EB, #10B981)" }}
          >
            {iniciais(usuario.nome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate" title={usuario.email}>{usuario.nome}</div>
            <div className="text-xs truncate" style={{ color: "#10B981" }}>{perfis}</div>
          </div>
          <button type="button" onClick={sair} aria-label="Sair" title="Sair" className="text-white/40 hover:text-white/70 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
