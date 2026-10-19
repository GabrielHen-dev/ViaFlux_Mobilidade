import ChamadoDoCliente from "@/components/portal/ChamadoDoCliente";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChamadoDoCliente id={id} />;
}
