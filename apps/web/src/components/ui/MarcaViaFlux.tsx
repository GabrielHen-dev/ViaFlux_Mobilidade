import { cn } from "@/utils/cn";

export const COR_DA_MARCA = "#0B2545";
export const COR_DO_DESTAQUE = "#F2A900";
export const TRACO_ESQUERDO = "M9 9 L16 23";
export const TRACO_DIREITO = "M16 23 L23 9";
export const PONTA_DA_SETA = "M18.2 11.6 L23 9 L23.8 14.4";

const tamanhos = {
  sm: 28,
  md: 32,
  lg: 40,
};

export function SimboloViaFlux({ tamanho = "md", className }: { tamanho?: keyof typeof tamanhos; className?: string }) {
  const lado = tamanhos[tamanho];
  return (
    <svg aria-hidden="true" width={lado} height={lado} viewBox="0 0 32 32" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="7" fill={COR_DA_MARCA} />
      <path d={TRACO_ESQUERDO} stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d={TRACO_DIREITO} stroke={COR_DO_DESTAQUE} strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d={PONTA_DA_SETA} stroke={COR_DO_DESTAQUE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function MarcaViaFlux({ tamanho = "md", comNome = false, className }: { tamanho?: keyof typeof tamanhos; comNome?: boolean; className?: string }) {
  if (!comNome) return <SimboloViaFlux tamanho={tamanho} className={className} />;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SimboloViaFlux tamanho={tamanho} />
      <div className="leading-none">
        <div className="text-lg font-bold tracking-tight text-[#0B2545]">Via<span className="text-acao">Flux</span></div>
        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-tinta-apagada">Mobilidade</div>
      </div>
    </div>
  );
}
