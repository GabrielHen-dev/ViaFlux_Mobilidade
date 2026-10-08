"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChamados } from "@/store/ChamadosContext";
export default function Sidebar() {
  const pathname = usePathname();
  const { lixeira } = useChamados();
  const lixeiraCount = lixeira.length;
  const navItems = [
    {
      id: "dashboard", href: "/",
      label: "Dashboard",
      icon: (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: "novo", href: "/chamados/novo",
      label: "Novo Chamado",
      icon: (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="viaflux-sidebar fixed top-0 left-0 h-full w-56 flex flex-col z-20" style={{ background: "var(--brand-navy)" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #10B981 100%)" }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l4-8 4 4 4-6 4 10" />
            </svg>
          </div>
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
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
                <path d="M10,11v6" /><path d="M14,11v6" />
                <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
              </svg>
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
            JM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">João Matos</div>
            <div className="text-xs truncate" style={{ color: "#10B981" }}>Atendente · Central</div>
          </div>
          <button disabled aria-label="Perfil demonstrativo, sem autenticação" title="Perfil demonstrativo, sem autenticação" className="text-white/40 hover:text-white/70 transition-colors">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
