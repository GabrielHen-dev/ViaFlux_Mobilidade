import type { Metadata } from "next";
import PortalDoCliente from "@/components/portal/PortalDoCliente";

export const metadata: Metadata = { title: "Meus chamados" };

export default function Page() { return <PortalDoCliente />; }
