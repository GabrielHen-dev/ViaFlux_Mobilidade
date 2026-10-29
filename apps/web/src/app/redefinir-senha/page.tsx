import type { Metadata } from "next";
import RedefinicaoDeSenha from "@/components/auth/RedefinicaoDeSenha";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <RedefinicaoDeSenha token={token ?? ""} />;
}
