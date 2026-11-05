"use client";

import Link from "next/link";
import { ArrowLeft, Compass, House, Radio } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { PERFIS_DA_CENTRAL, rotaInicialDo, usuarioTemPerfil } from "@/utils/perfis";

export default function ChamadoIndisponivel({ id }: { id?: string }) {
  const { estado } = useAuth();
  const usuario = estado.status === "autenticado" ? estado.usuario : null;
  const daCentral = usuario !== null && usuarioTemPerfil(usuario, PERFIS_DA_CENTRAL);
  const inicio = usuario ? rotaInicialDo(usuario) : "/";
  return (
    <main id="conteudo" className="relative isolate flex min-h-[calc(100vh-5rem)] items-center overflow-hidden bg-[#F3F7FB] px-4 py-12 md:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-44 h-[30rem] w-[30rem] rounded-full border border-blue-200/70" />
        <div className="absolute -right-16 -top-28 h-[24rem] w-[24rem] rounded-full border border-blue-200/50" />
        <div className="absolute -bottom-40 -left-24 h-[27rem] w-[27rem] rounded-full bg-[radial-gradient(circle,rgba(28,107,171,0.09),transparent_68%)]" />
      </div>
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-[1fr_1.15fr] md:gap-16">
        <div className="relative mx-auto flex aspect-square w-full max-w-[19rem] items-center justify-center rounded-[2.5rem] border border-blue-100 bg-white/85 shadow-[0_24px_70px_-40px_rgba(15,46,77,0.5)] md:max-w-[23rem]">
          <div aria-hidden="true" className="absolute inset-5 rounded-[2rem] border border-dashed border-blue-200" />
          <div aria-hidden="true" className="absolute inset-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#e8f3fc,transparent_68%)]" />
          <div className="relative text-center">
            <p className="font-display text-[6.5rem] font-extrabold leading-none tracking-[-0.09em] text-brand-navy md:text-[8rem]">404</p>
            <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-blue">
              <Radio size={13} aria-hidden /> Sinal não encontrado
            </div>
          </div>
          <span aria-hidden="true" className="absolute right-7 top-8 h-2.5 w-2.5 rounded-full bg-brand-green shadow-[0_0_0_6px_rgba(25,135,84,0.12)]" />
        </div>

        <section className="max-w-xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
            <Compass size={15} aria-hidden /> ViaFlux · Central de mobilidade
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-brand-navy md:text-5xl">
            {id ? "Chamado não encontrado" : "Este caminho não leva a uma página."}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            {id ? `O chamado #${id} não existe ou não está disponível para o seu perfil.` : "O endereço pode ter mudado ou não estar mais disponível. Vamos ajudar você a voltar para uma área conhecida."}
            {daCentral && id ? " Confira também a lixeira." : ""}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={inicio} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(15,46,77,0.75)] transition hover:-translate-y-0.5 hover:bg-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              <House size={16} aria-hidden /> Ir para o início
            </Link>
            <Link href={inicio} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
              <ArrowLeft size={16} aria-hidden /> Voltar à minha área
            </Link>
            {daCentral && id && <Link href="/lixeira" className="inline-flex min-h-12 items-center rounded-xl px-3 py-3 text-sm font-semibold text-brand-blue underline-offset-4 hover:underline">Abrir lixeira</Link>}
          </div>
          <p className="mt-8 border-l-2 border-brand-green pl-3 text-xs leading-5 text-slate-500">Se você chegou aqui por um link de chamado, confirme o protocolo ou peça acesso à equipe responsável.</p>
        </section>
      </div>
    </main>
  );
}
