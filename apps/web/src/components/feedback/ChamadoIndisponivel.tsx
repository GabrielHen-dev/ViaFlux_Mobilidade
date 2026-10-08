import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ChamadoIndisponivel({ id }: { id?: string }) {
  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="mb-3 text-xl font-bold text-brand-navy">Chamado não encontrado</h1>
        <p className="mb-6 text-sm text-slate-500">{id ? `O chamado #${id} não está disponível. Verifique a lixeira ou volte ao Dashboard.` : "Esta página não está disponível."}</p>
        <div className="flex justify-center gap-3">
          <Button asChild className="px-4 py-2.5"><Link href="/">Ir ao Dashboard</Link></Button>
          <Button asChild variant="outline" className="px-4 py-2.5"><Link href="/lixeira">Lixeira</Link></Button>
        </div>
      </div>
    </main>
  );
}
