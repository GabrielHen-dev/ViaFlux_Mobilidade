import type { Metadata } from "next";
import DetalhesChamado from "@/components/chamados/DetalhesChamado";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado ${id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalhesChamado id={id} />;
}
