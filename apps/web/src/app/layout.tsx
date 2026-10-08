import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { AuthProvider } from "@/store/AuthContext";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = { title: "ViaFlux Mobilidade · Central de Chamados", description: "Protótipo navegável da Central de Chamados ViaFlux Mobilidade." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${inter.variable} ${montserrat.variable}`}>
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Pular para o conteúdo</a>
    <AuthProvider>{children}</AuthProvider>
  </body></html>;
}
