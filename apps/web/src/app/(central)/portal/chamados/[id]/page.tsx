import type { Metadata } from "next";
import ChamadoDoCliente from "@/components/portal/ChamadoDoCliente";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado ${id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChamadoDoCliente id={id} />;
}
