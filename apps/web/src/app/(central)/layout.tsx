import AreaProtegida from "@/components/auth/AreaProtegida";
import Sidebar from "@/components/layout/Sidebar";

export default function CentralLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AreaProtegida>
    <div className="viaflux-shell flex min-h-screen bg-brand-light"><Sidebar /><div className="viaflux-content">{children}</div></div>
  </AreaProtegida>;
}
