"use client";
import { useState } from "react";
import type { Chamado } from "@/types/chamado";
import { useChamados } from "@/store/ChamadosContext";
export default function TimelineChamado({ chamado }: { chamado: Chamado }) {
  const { registrarAtualizacao } = useChamados();
  const timeline = chamado.timeline;
  const [novaAtualizacao, setNovaAtualizacao] = useState("");
  const addUpdate = () => {
    if (!novaAtualizacao.trim()) return;
    registrarAtualizacao(chamado.id, { acao: "Atualização", detalhe: novaAtualizacao.trim(), icon: "📝" });
    setNovaAtualizacao("");
  };


  return (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h3 className="font-semibold text-brand-navy text-sm mb-5" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Timeline do histórico
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E2E8F0]" />
                <div className="space-y-5">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-[#E2E8F0] flex items-center justify-center text-sm z-10 flex-shrink-0">
                        {item.icon}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-brand-dark text-sm">{item.acao}</span>
                          <span className="text-xs text-[#94A3B8]">{item.hora}</span>
                        </div>
                        <p className="text-xs text-[#64748B]">{item.detalhe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add update */}
              <div className="mt-5 pt-5 border-t border-[#F1F5F9]">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
                      rows={2}
                      aria-label="Adicionar atualização ao histórico" placeholder="Adicionar atualização ao histórico..."
                      value={novaAtualizacao}
                      onChange={(e) => setNovaAtualizacao(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={addUpdate}
                    disabled={!novaAtualizacao.trim()}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold self-end hover:opacity-90 disabled:opacity-40 transition-opacity"
                    style={{ background: "var(--brand-green)" }}
                  >
                    Registrar
                  </button>
                </div>
              </div>
            </div>
  );
}
