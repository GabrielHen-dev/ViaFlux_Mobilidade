"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/usuarios", rotulo: "Usuários" },
  { href: "/dev-tools", rotulo: "Dev tools" },
];

export default function AbasDeConfiguracoes() {
  const caminho = usePathname();
  return (
    <nav aria-label="Configurações" className="mb-4 flex rounded border border-linha bg-white px-2">
      {ABAS.map((aba) => (
        <Link key={aba.href} href={aba.href} aria-current={caminho.startsWith(aba.href) ? "page" : undefined} className="vf-aba alvo-toque px-3 py-3">
          {aba.rotulo}
        </Link>
      ))}
    </nav>
  );
}
