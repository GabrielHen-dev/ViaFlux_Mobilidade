"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/AuthContext";
import { PERFIS_DA_CENTRAL, rotaInicialDo, usuarioTemPerfil } from "@/utils/perfis";

export default function ChamadoIndisponivel({ id }: { id?: string }) {
  const { estado } = useAuth();
  const usuario = estado.status === "autenticado" ? estado.usuario : null;
  const daCentral = usuario !== null && usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL);
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center md:p-10">
        <h1 className="mb-3 text-xl font-bold text-brand-navy">{id ? "Chamado não encontrado" : "Página não encontrada"}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {id ? `O chamado #${id} não existe ou não está disponível para o seu perfil.` : "O endereço acessado não existe."}
          {daCentral && id ? " Verifique a lixeira." : ""}
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild className="px-4 py-2.5"><Link href={usuario ? rotaInicialDo(usuario) : "/"}>Voltar ao início</Link></Button>
          {daCentral && <Button asChild variant="outline" className="px-4 py-2.5"><Link href="/lixeira">Lixeira</Link></Button>}
        </div>
      </div>
    </main>
  );
}
