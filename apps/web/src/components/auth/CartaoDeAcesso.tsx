import type { ReactNode } from "react";
import MarcaViaFlux, { SimboloViaFlux } from "@/components/ui/MarcaViaFlux";

export const labelDeAcessoClass = "block text-xs font-medium text-[#475569] mb-1.5";
export const campoDeAcessoClass =
  "w-full px-3.5 py-2.5 rounded border border-linha-forte text-sm text-tinta outline-none focus:border-acao focus:ring-2 focus:ring-acao/10 transition-all aria-[invalid=true]:border-red-400";
export const botaoDeAcessoClass =
  "w-full rounded-xl vf-botao-primario py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40";
export const linkDeAcessoClass = "font-semibold text-acao underline-offset-2 hover:underline";

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
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main id="conteudo" className="grid min-h-screen bg-fundo lg:grid-cols-[minmax(0,1fr)_minmax(28rem,36rem)]">
      <aside className="relative hidden overflow-hidden bg-marca p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden>
        <div className="flex items-center gap-3">
          <SimboloViaFlux tamanho="lg" className="ring-1 ring-white/20" />
          <div className="leading-none">
            <div className="text-xl font-bold tracking-tight">Via<span className="text-destaque">Flux</span></div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">Mobilidade</div>
          </div>
        </div>
        <div className="max-w-md">
          <div className="mb-5 h-1 w-12 rounded bg-destaque" />
          <p className="text-2xl font-medium leading-snug">Central de Chamados ViaFlux</p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">Abertura, classificação e acompanhamento de chamados de assistência veicular e gestão de frotas.</p>
        </div>
        <svg className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 text-white/5" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
          <path d="M9 9 L16 23 L23 9" />
        </svg>
      </aside>
      <div className="flex items-center justify-center border-t-4 border-acao p-4 lg:border-t-0 lg:bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <MarcaViaFlux tamanho="lg" comNome />
          </div>

          <div className="rounded border border-linha bg-white p-8 shadow-md lg:border-0 lg:p-0 lg:shadow-none">
            <h1 className={subtitulo ? "mb-1 text-xl font-bold text-tinta" : "mb-6 text-xl font-bold text-tinta"}>{titulo}</h1>
            {subtitulo && <p className="mb-6 text-sm text-tinta-suave">{subtitulo}</p>}
            {children}
          </div>
          {rodape && <div className="mt-6 text-center text-sm text-tinta-suave">{rodape}</div>}
        </div>
      </div>
    </main>
  );
}
