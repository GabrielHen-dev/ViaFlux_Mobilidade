"use client";
import Link from "next/link";
import { useChamados } from "@/store/ChamadosContext";
import { useState } from "react";
import { StatusBadge, PrioridadeBadge } from "@/components/ui/StatusBadge";

export default function Lixeira() {
  const { lixeira: chamados, restaurarChamado: onRestaurar, excluirDefinitivo: onExcluirDefinitivo, esvaziarLixeira: onEsvaziar } = useChamados();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [confirmandoEsvaziar, setConfirmandoEsvaziar] = useState(false);

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Voltar ao Dashboard"
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white transition-all"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Lixeira
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">
                {chamados.length === 0
                  ? "Nenhum chamado excluído"
                  : `${chamados.length} chamado${chamados.length > 1 ? "s" : ""} excluído${chamados.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {chamados.length > 0 && (
            <div>
              {confirmandoEsvaziar ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#64748B]">Excluir todos permanentemente?</span>
                  <button
                    onClick={() => { onEsvaziar(); setConfirmandoEsvaziar(false); }}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                    style={{ background: "#DC2626" }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmandoEsvaziar(false)}
                    className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-white transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmandoEsvaziar(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#FECACA] text-sm font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
                  </svg>
                  Esvaziar lixeira
                </button>
              )}
            </div>
          )}
        </div>

        {chamados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#F1F5F9" }}>
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
                <path d="M10,11v6" /><path d="M14,11v6" />
                <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
              </svg>
            </div>
            <h3 className="font-bold text-[#64748B] mb-1" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
              Lixeira vazia
            </h3>
            <p className="text-sm text-[#94A3B8]">Chamados excluídos aparecem aqui.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#FEF2F2] flex items-center gap-2" style={{ background: "#FFF5F5" }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-xs text-[#EF4444] font-medium">
                Chamados excluídos ficam aqui. Você pode restaurá-los ou excluí-los permanentemente.
              </span>
            </div>

            <div className="overflow-x-auto"><table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-brand-light">
                  {["Nº chamado", "Cliente / Veículo", "Tipo", "Status", "Prioridade", "Abertura", "Ações"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {chamados.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FFF5F5] transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-[#94A3B8] text-sm line-through">#{c.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-[#94A3B8] text-sm">{c.cliente}</div>
                      <div className="text-xs text-[#CBD5E1] mt-0.5">{c.modelo} · {c.placa}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#94A3B8]">{c.tipo}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4"><PrioridadeBadge prioridade={c.prioridade} /></td>
                    <td className="px-5 py-4 text-xs text-[#94A3B8]">{c.abertura}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { onRestaurar(c.id); }}
                          className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                        >
                          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1,4 1,10 7,10" /><path d="M3.51,15a9,9,0,1,0,.49-3.54" />
                          </svg>
                          Restaurar
                        </button>
                        <span className="text-[#E2E8F0]">|</span>
                        {confirmandoId === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { onExcluirDefinitivo(c.id); setConfirmandoId(null); }}
                              className="text-xs font-semibold text-white px-2 py-0.5 rounded"
                              style={{ background: "#DC2626" }}
                            >
                              Excluir
                            </button>
                            <button
                              aria-label="Cancelar exclusão definitiva" onClick={() => setConfirmandoId(null)}
                              className="text-xs text-[#94A3B8] hover:text-[#64748B]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmandoId(c.id)}
                            className="text-xs font-semibold text-[#EF4444] hover:underline"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </main>
    </div>
  );
}
