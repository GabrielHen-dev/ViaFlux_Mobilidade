import AreaProtegida from "@/components/auth/AreaProtegida";
import Sidebar from "@/components/layout/Sidebar";
import { ChamadosProvider } from "@/store/ChamadosContext";

export default function CentralLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AreaProtegida>
    <ChamadosProvider><div className="viaflux-shell flex min-h-screen bg-brand-light"><Sidebar /><div className="viaflux-content">{children}</div></div></ChamadosProvider>
  </AreaProtegida>;
}
