import Triagem from "@/components/forms/Triagem";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Triagem id={id} />;
}
