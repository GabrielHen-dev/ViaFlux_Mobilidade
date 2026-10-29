import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import Provedores from "@/components/providers/Provedores";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Central de Chamados · ViaFlux Mobilidade", template: "%s · ViaFlux Mobilidade" },
  description: "Central de Chamados da ViaFlux Mobilidade: abertura, classificação e acompanhamento de chamados de assistência veicular e gestão de frotas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${montserrat.variable}`}>
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Pular para o conteúdo</a>
    <Provedores>{children}</Provedores>
  </body></html>;
}
