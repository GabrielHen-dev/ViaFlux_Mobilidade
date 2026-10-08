import DetalhesChamado from "@/components/chamados/DetalhesChamado";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalhesChamado id={id} />;
}
