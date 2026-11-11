import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const variantesDoSelo = cva("inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", {
  variants: {
    tom: {
      neutro: "bg-slate-100 text-tinta-suave",
      acao: "bg-acao-suave text-acao",
      sucesso: "bg-[var(--vf-sucesso-fundo)] text-[var(--vf-sucesso)]",
      alerta: "bg-[var(--vf-alerta-fundo)] text-[var(--vf-alerta)]",
      perigo: "bg-[var(--vf-perigo-fundo)] text-[var(--vf-perigo)]",
      destaque: "bg-[#FFF4D6] text-[#7A5600]",
    },
  },
  defaultVariants: { tom: "neutro" },
});

export function Badge({ className, tom, ...props }: ComponentProps<"span"> & VariantProps<typeof variantesDoSelo>) {
  return <span className={cn(variantesDoSelo({ tom }), className)} {...props} />;
}
