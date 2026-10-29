import type { Metadata } from "next";
import AcompanhamentoTerceiro from "@/components/chamados/AcompanhamentoTerceiro";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Serviço terceirizado · ${id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AcompanhamentoTerceiro id={id} />;
}
