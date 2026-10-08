import { cn } from "@/utils/cn";

export const TRACO_DA_MARCA = "M3 17l4-8 4 4 4-6 4 10";
export const GRADIENTE_DA_MARCA = "linear-gradient(135deg, #2563EB 0%, #10B981 100%)";

const tamanhos = {
  md: { caixa: "h-8 w-8 rounded-lg", traco: 16 },
  lg: { caixa: "h-10 w-10 rounded-xl", traco: 20 },
};

export default function MarcaViaFlux({ tamanho = "md", className }: { tamanho?: keyof typeof tamanhos; className?: string }) {
  const { caixa, traco } = tamanhos[tamanho];
  return (
    <div className={cn("flex shrink-0 items-center justify-center", caixa, className)} style={{ background: GRADIENTE_DA_MARCA }}>
      <svg aria-hidden="true" width={traco} height={traco} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={TRACO_DA_MARCA} />
      </svg>
    </div>
  );
}
