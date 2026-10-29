import type { Metadata } from "next";
import FerramentasDeDesenvolvimento from "@/components/devtools/FerramentasDeDesenvolvimento";

export const metadata: Metadata = { title: "Dev tools" };

export default function Page() { return <FerramentasDeDesenvolvimento />; }
