import type { Metadata } from "next";
import Triagem from "@/components/forms/Triagem";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Classificação · ${id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Triagem id={id} />;
}
