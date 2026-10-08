import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Entrar · ViaFlux Mobilidade" };

export default function Page() { return <LoginForm />; }
