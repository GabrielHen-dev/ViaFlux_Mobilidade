import AcompanhamentoTerceiro from "@/components/chamados/AcompanhamentoTerceiro";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AcompanhamentoTerceiro id={id} />;
}
