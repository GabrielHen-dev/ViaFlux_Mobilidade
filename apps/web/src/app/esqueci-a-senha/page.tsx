import type { Metadata } from "next";
import RecuperacaoDeSenha from "@/components/auth/RecuperacaoDeSenha";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function Page() { return <RecuperacaoDeSenha />; }
