import type { Metadata } from "next";
import FilaDeTriagem from "@/components/triagem/FilaDeTriagem";

export const metadata: Metadata = { title: "Classificação" };

export default function Page() { return <FilaDeTriagem />; }
