import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Provedores from "@/components/providers/Provedores";
import "@/styles/globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Central de Chamados · ViaFlux Mobilidade", template: "%s · ViaFlux Mobilidade" },
  description: "Central de Chamados da ViaFlux Mobilidade: abertura, classificação e acompanhamento de chamados de assistência veicular e gestão de frotas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={roboto.variable}>
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:shadow-md">Pular para o conteúdo</a>
    <Provedores>{children}</Provedores>
  </body></html>;
}
