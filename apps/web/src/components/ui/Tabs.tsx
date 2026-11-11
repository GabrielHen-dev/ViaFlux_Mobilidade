"use client";

import * as Primitivo from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export const Tabs = Primitivo.Root;
export const TabsContent = Primitivo.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof Primitivo.List>) {
  return <Primitivo.List className={cn("flex overflow-x-auto border-b border-linha", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitivo.Trigger>) {
  return <Primitivo.Trigger className={cn("vf-aba alvo-toque shrink-0 px-3 py-2.5", className)} {...props} />;
}
