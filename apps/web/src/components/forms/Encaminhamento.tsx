"use client";
import Link from "next/link";
import { setores, responsaveis, statuses, statusColor } from "@/mocks/opcoes";
import { useChamados } from "@/store/ChamadosContext";
import { horaAtual } from "@/utils/date";
import { useChamado } from "@/hooks/useChamado";
import ChamadoIndisponivel from "@/components/feedback/ChamadoIndisponivel";
import { useState } from "react";
import type { Chamado } from "@/types/chamado";
import { StatusBadge, PrioridadeBadge } from "@/components/ui/StatusBadge";

function EncaminhamentoConteudo({ chamado }: { chamado: Chamado }) {
  const { atualizarChamado: onAtualizar } = useChamados();
  const historico = chamado.historico;
  const [setor, setSetor] = useState(chamado.setor || "");
  const [responsavel, setResponsavel] = useState(chamado.responsavel || "");
  const [status, setStatus] = useState(chamado.status);
  const [obs, setObs] = useState("");
  const [encaminhado, setEncaminhado] = useState(false);

  const handleEncaminhar = () => {
    if (!setor || !responsavel) return;
    const hora = horaAtual();
    const updated: Chamado = { ...chamado, setor, responsavel, status: "Em atendimento" };
    onAtualizar(updated, { acao: "Encaminhado", detalhe: `${setor} · ${responsavel}${obs.trim() ? " · " + obs.trim() : ""}`, icon: "🟡" }, { hora, acao: "Encaminhado", de: chamado.setor || "—", para: setor + " · " + responsavel });
    setStatus("Em atendimento");
    setEncaminhado(true);
  };

  const handleAtualizarStatus = () => {
    const hora = horaAtual();
    const updated: Chamado = { ...chamado, setor, responsavel, status };
    onAtualizar(updated, { acao: "Status atualizado", detalhe: status + (obs.trim() ? " · " + obs.trim() : ""), icon: "📝" }, { hora, acao: "Status atualizado", de: chamado.status, para: status + (obs.trim() ? " · " + obs.trim() : "") });
    setObs("");
  };

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white transition-all">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Encaminhamento — #{chamado.id}
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">Defina setor, responsável e acompanhe o status</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Resumo */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-brand-dark">{chamado.cliente}</div>
                    <div className="text-sm text-[#94A3B8]">{chamado.modelo} · {chamado.placa} · {chamado.tipo}</div>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={chamado.status} />
                    <PrioridadeBadge prioridade={chamado.prioridade} />
                  </div>
                </div>
                <div className="text-sm text-[#64748B]">{chamado.localizacao}</div>
              </div>

              {/* Setor */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <h2 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Setor responsável
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {setores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSetor(s.id); setResponsavel(""); }}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: setor === s.id ? "#2563EB" : "#E2E8F0",
                        background: setor === s.id ? "#EFF6FF" : "white",
                      }}
                    >
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="font-semibold text-sm" style={{ color: setor === s.id ? "#2563EB" : "#1E293B" }}>
                        {s.id}
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsável */}
              {setor && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                  <h2 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                    Responsável
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {(responsaveis[setor] || []).map((r) => (
                      <button
                        key={r}
                        onClick={() => setResponsavel(r)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: responsavel === r ? "#2563EB" : "#E2E8F0",
                          background: responsavel === r ? "#EFF6FF" : "white",
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #2563EB, #10B981)" }}
                        >
                          {r.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium" style={{ color: responsavel === r ? "#2563EB" : "#1E293B" }}>
                          {r}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <h2 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Status do chamado
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      aria-pressed={status === s} onClick={() => setStatus(s)}
                      className="px-3.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all"
                      style={{
                        borderColor: status === s ? statusColor[s] : "#E2E8F0",
                        background: status === s ? statusColor[s] + "18" : "white",
                        color: status === s ? statusColor[s] : "#64748B",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
                  rows={2}
                  aria-label="Observação do encaminhamento" placeholder="Observação (opcional)..."
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleEncaminhar}
                  disabled={!setor || !responsavel}
                  className="flex-1 py-3.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: "var(--brand-green)" }}
                >
                  Encaminhar
                </button>
                <button
                  onClick={handleAtualizarStatus}
                  className="flex-1 py-3.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "var(--brand-blue)" }}
                >
                  Atualizar Status
                </button>
              </div>

              {encaminhado && (
                <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#ECFDF5" }}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  <span className="text-sm font-semibold text-[#059669]">
                    Chamado encaminhado para {responsavel} · {setor}
                  </span>
                </div>
              )}
            </div>

            {/* Histórico lateral */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <h3 className="font-semibold text-brand-navy text-xs uppercase tracking-wide mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Histórico de alterações
                </h3>
                {historico.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] text-center py-6">Nenhuma alteração registrada</p>
                ) : (
                  <div className="space-y-4">
                    {historico.map((h, i) => (
                      <div key={i} className="border-l-2 border-[#E2E8F0] pl-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-brand-dark">{h.acao}</span>
                          <span className="text-xs text-[#94A3B8]">{h.hora}</span>
                        </div>
                        <div className="text-xs text-[#94A3B8]">
                          {h.de} → <span className="text-brand-blue font-medium">{h.para}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fluxo visual */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <h3 className="font-semibold text-brand-navy text-xs uppercase tracking-wide mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Fluxo do chamado
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Abertura", done: true },
                    { label: "Triagem", done: chamado.status !== "Aberto" },
                    { label: "Encaminhamento", done: encaminhado || !!chamado.responsavel },
                    { label: "Atendimento", done: chamado.status === "Em atendimento" || chamado.status === "Resolvido" || chamado.status === "Encerrado" },
                    { label: "Resolvido", done: chamado.status === "Resolvido" || chamado.status === "Encerrado" },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: step.done ? "#10B981" : "#F1F5F9",
                          color: step.done ? "white" : "#94A3B8",
                        }}
                      >
                        {step.done ? "✓" : i + 1}
                      </div>
                      <span className="text-xs font-medium" style={{ color: step.done ? "#059669" : "#94A3B8" }}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Encaminhamento({ id }: { id: string }) {
  const chamado = useChamado(id);
  return chamado ? <EncaminhamentoConteudo key={id} chamado={chamado} /> : <ChamadoIndisponivel id={id} />;
}
