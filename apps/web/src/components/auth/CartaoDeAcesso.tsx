import type { ReactNode } from "react";
import MarcaViaFlux from "@/components/ui/MarcaViaFlux";

export const labelDeAcessoClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
export const campoDeAcessoClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all aria-[invalid=true]:border-red-400";
export const botaoDeAcessoClass =
  "w-full rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";
export const linkDeAcessoClass = "font-semibold text-brand-blue underline-offset-2 hover:underline";

export function ErroDeAcesso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{mensagem}</p>;
}

export function AvisoDeAcesso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">{mensagem}</p>;
}

export function ErroDoCampo({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null;
  return <p id={id} className="mt-1 text-xs text-red-600">{mensagem}</p>;
}

export default function CartaoDeAcesso({ titulo, subtitulo, children, rodape }: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main id="conteudo" className="flex min-h-screen items-center justify-center bg-brand-navy p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <MarcaViaFlux tamanho="lg" />
          <div>
            <div className="font-display text-lg font-bold leading-tight text-white">ViaFlux</div>
            <div className="text-sm leading-tight text-brand-green">Mobilidade</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-xl font-bold text-brand-navy">{titulo}</h1>
          <p className="mb-6 text-sm text-slate-500">{subtitulo}</p>
          {children}
        </div>
        {rodape && <div className="mt-6 text-center text-sm text-slate-300">{rodape}</div>}
      </div>
    </main>
  );
}
