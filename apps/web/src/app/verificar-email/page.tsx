import type { Metadata } from "next";
import VerificacaoDeEmail from "@/components/auth/VerificacaoDeEmail";

export const metadata: Metadata = { title: "Confirmar e-mail · ViaFlux Mobilidade" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerificacaoDeEmail token={token ?? ""} />;
}
