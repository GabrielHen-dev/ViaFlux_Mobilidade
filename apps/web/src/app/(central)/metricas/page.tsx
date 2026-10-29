import type { Metadata } from "next";
import PainelDeMetricas from "@/components/metricas/PainelDeMetricas";

export const metadata: Metadata = { title: "Métricas" };

export default function Page() { return <PainelDeMetricas />; }
