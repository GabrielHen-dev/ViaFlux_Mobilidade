import AreaProtegida from "@/components/auth/AreaProtegida";
import Sidebar from "@/components/layout/Sidebar";
import Topo from "@/components/layout/Topo";

export default function CentralLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AreaProtegida>
    <div className="viaflux-shell">
      <Sidebar />
      <Topo />
      <div className="viaflux-content">{children}</div>
    </div>
  </AreaProtegida>;
}
