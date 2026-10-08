"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";

export default function AreaProtegida({ children }: { children: ReactNode }) {
  const { estado } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (estado.status === "anonimo") router.replace("/login");
  }, [estado.status, router]);

  if (estado.status !== "autenticado") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-brand-light text-sm text-slate-500">
        Verificando sessão…
      </div>
    );
  }
  return children;
}
