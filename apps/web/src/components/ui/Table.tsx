import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("vf-tabela", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-2.5 text-left", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-2.5 align-middle", className)} {...props} />;
}
