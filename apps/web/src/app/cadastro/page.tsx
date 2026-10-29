import type { Metadata } from "next";
import CadastroForm from "@/components/auth/CadastroForm";

export const metadata: Metadata = { title: "Criar conta" };

export default function Page() { return <CadastroForm />; }
