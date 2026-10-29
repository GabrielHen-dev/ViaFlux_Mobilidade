"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import Dashboard from "@/components/chamados/Dashboard";
import { Carregando } from "@/components/feedback/EstadoDaConsulta";
import { PERFIS_DA_CENTRAL, rotaInicialDo, usuarioTemPerfil } from "@/utils/perfis";

export default function Inicio() {
  const usuario = useUsuarioAutenticado();
  const router = useRouter();
  const daCentral = usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL);
  const destino = rotaInicialDo(usuario);

  useEffect(() => {
    if (!daCentral && destino !== "/") router.replace(destino);
  }, [daCentral, destino, router]);

  if (daCentral) return <Dashboard />;
  if (destino !== "/") return <main id="conteudo"><Carregando texto="Carregando…" /></main>;
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-brand-navy">Perfil sem acesso configurado</h1>
        <p className="text-sm text-slate-500">Solicite ao administrador a configuração do seu perfil.</p>
      </div>
    </main>
  );
}
