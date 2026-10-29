import type { Metadata } from "next";
import Encaminhamento from "@/components/forms/Encaminhamento";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Transferência · ${id}` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Encaminhamento id={id} />;
}
