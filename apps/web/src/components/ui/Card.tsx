import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("vf-cartao", className)} {...props} />;
}

export function CardHeader({ titulo, acoes, id, className }: { titulo: ReactNode; acoes?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-linha px-4 py-3", className)}>
      <h2 id={id} className="text-sm font-medium text-tinta">{titulo}</h2>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}
