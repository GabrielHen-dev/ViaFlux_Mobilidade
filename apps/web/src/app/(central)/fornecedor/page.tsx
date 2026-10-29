import type { Metadata } from "next";
import AreaDoFornecedor from "@/components/fornecedor/AreaDoFornecedor";

export const metadata: Metadata = { title: "Meus serviços" };

export default function Page() { return <AreaDoFornecedor />; }
