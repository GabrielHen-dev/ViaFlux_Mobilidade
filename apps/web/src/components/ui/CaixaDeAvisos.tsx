"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";

export default function CaixaDeAvisos() {
  return (
    <Toaster
      position="top-right"
      closeButton
      duration={4500}
      visibleToasts={4}
      offset={{ top: 20, right: 20 }}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      icons={{
        success: <CircleCheck size={18} className="text-brand-green" aria-hidden />,
        error: <CircleAlert size={18} className="text-red-600" aria-hidden />,
        warning: <TriangleAlert size={18} className="text-amber-500" aria-hidden />,
        info: <Info size={18} className="text-brand-blue" aria-hidden />,
        loading: <LoaderCircle size={18} className="animate-spin text-slate-400" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "group relative flex w-full items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white py-3.5 pl-4 pr-9 font-body shadow-[0_12px_32px_-12px_rgba(15,44,89,0.28)] sm:w-[360px]",
          icon: "mt-0.5 flex shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-sm font-semibold text-brand-navy",
          description: "text-xs leading-relaxed text-slate-500",
          closeButton: "absolute right-2 top-2 left-auto flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 [&>svg]:h-3.5 [&>svg]:w-3.5",
          actionButton: "ml-2 shrink-0 self-center rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90",
          cancelButton: "ml-2 shrink-0 self-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50",
          success: "border-l-4 border-l-brand-green",
          error: "border-l-4 border-l-red-500",
          warning: "border-l-4 border-l-amber-400",
          info: "border-l-4 border-l-brand-blue",
        },
      }}
    />
  );
}
