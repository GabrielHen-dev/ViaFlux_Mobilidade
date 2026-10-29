import type { Metadata } from "next";
import RecuperacaoDeSenha from "@/components/auth/RecuperacaoDeSenha";

export const metadata: Metadata = { title: "Esqueci minha senha · ViaFlux Mobilidade" };

export default function Page() { return <RecuperacaoDeSenha />; }
