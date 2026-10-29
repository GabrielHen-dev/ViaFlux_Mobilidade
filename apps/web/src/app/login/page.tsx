import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Acessar conta" };

export default function Page() { return <LoginForm />; }
