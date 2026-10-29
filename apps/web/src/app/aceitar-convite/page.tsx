import type { Metadata } from "next";
import AceiteDeConvite from "@/components/auth/AceiteDeConvite";

export const metadata: Metadata = { title: "Aceitar convite" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AceiteDeConvite token={token ?? ""} />;
}
