"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import { rotaInicialDo, usuarioTemPerfil } from "@/utils/perfis";

export default function PerfilRequerido({ perfis, children }: { perfis: readonly string[]; children: ReactNode }) {
  const usuario = useUsuarioAutenticado();
  if (usuarioTemPerfil(usuario, perfis)) return children;
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <ShieldAlert size={28} className="mx-auto mb-3 text-amber-600" aria-hidden />
        <h1 className="mb-2 text-xl font-bold text-brand-navy">Acesso não permitido</h1>
        <p className="mb-6 text-sm text-slate-500">Seu perfil não tem acesso a esta tela.</p>
        <Link href={rotaInicialDo(usuario)} className="alvo-toque inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
