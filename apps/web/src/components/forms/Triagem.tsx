"use client";
import Link from "next/link";
import { tipos, gravidades } from "@/mocks/opcoes";
import { useChamados } from "@/store/ChamadosContext";
import { useChamado } from "@/hooks/useChamado";
import ChamadoIndisponivel from "@/components/feedback/ChamadoIndisponivel";
import { useState } from "react";
import type { Chamado } from "@/types/chamado";
import { StatusBadge } from "@/components/ui/StatusBadge";

function TriagemConteudo({ chamado }: { chamado: Chamado }) {
  const { atualizarChamado: onAtualizar } = useChamados();
  const [tipo, setTipo] = useState(chamado.tipo || "Mecânico");
  const [gravidade, setGravidade] = useState<typeof gravidades[number]["label"]>(chamado.prioridade as typeof gravidades[number]["label"] || "Média");
  const [justificativa, setJustificativa] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  const gravSel = gravidades.find((g) => g.label === gravidade)!;

  const confirmar = () => {
    const updated: Chamado = {
      ...chamado,
      tipo,
      prioridade: gravidade,
      status: "Em triagem",
      sla: gravSel.sla + " restantes",
    };
    onAtualizar(updated, { acao: "Triagem realizada", detalhe: `Prioridade ${gravidade} · ${tipo}${justificativa.trim() ? " · " + justificativa.trim() : ""}`, icon: "🔵" });
    setConfirmado(true);
  };

  if (confirmado) {
    return (
      <div className="min-w-0">
        <main id="conteudo" className="min-h-[70vh] md:min-h-screen flex items-center justify-center p-4 md:p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#ECFDF5" }}>
              <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-brand-navy mb-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Triagem confirmada!</h2>
            <p className="text-[#64748B] text-sm mb-1">Chamado <span className="font-bold text-brand-blue">#{chamado.id}</span></p>
            <p className="text-sm text-[#475569] mb-6">
              Prioridade <span className="font-bold" style={{ color: gravSel.color }}>{gravidade}</span> · SLA {gravSel.sla}
            </p>
            <div className="flex gap-3">
              <Link href={`/chamados/${chamado.id}`} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-brand-light transition-colors">
                Ver detalhes
              </Link>
              <Link href={`/chamados/${chamado.id}/encaminhamento`} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: "var(--brand-blue)" }}>
                Encaminhar
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`} className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white transition-all">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Triagem — #{chamado.id}
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">Defina o tipo e a gravidade do chamado</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Resumo */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-brand-dark">{chamado.cliente}</div>
                  <div className="text-sm text-[#94A3B8] mt-0.5">{chamado.modelo} · {chamado.placa}</div>
                  <div className="text-sm text-[#64748B] mt-1">{chamado.localizacao}</div>
                </div>
                <StatusBadge status={chamado.status} />
              </div>
              {chamado.descricao && (
                <div className="mt-3 pt-3 border-t border-[#F1F5F9] text-sm text-[#475569]">{chamado.descricao}</div>
              )}
            </div>

            {/* Tipo */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Tipo do problema
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                {tipos.map((t) => (
                  <button
                    key={t}
                    aria-pressed={tipo === t} onClick={() => setTipo(t)}
                    className="py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all"
                    style={{
                      borderColor: tipo === t ? "#2563EB" : "#E2E8F0",
                      background: tipo === t ? "#EFF6FF" : "white",
                      color: tipo === t ? "#2563EB" : "#475569",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Gravidade */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Gravidade
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gravidades.map((g) => (
                  <button
                    key={g.label}
                    aria-pressed={gravidade === g.label} onClick={() => setGravidade(g.label)}
                    className="p-4 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: gravidade === g.label ? g.color : "#E2E8F0",
                      background: gravidade === g.label ? g.bg : "white",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm" style={{ color: g.color }}>{g.label}</span>
                      <span className="text-xs font-medium text-[#94A3B8]">SLA {g.sla}</span>
                    </div>
                    <p className="text-xs text-[#64748B]">{g.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Indicador */}
            {gravidade && (
              <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: gravSel.bg }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ background: gravSel.color }}
                >
                  {gravSel.sla}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: gravSel.color }}>
                    Prioridade {gravSel.label}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    SLA de atendimento: {gravSel.sla} · {gravSel.desc}
                  </div>
                </div>
              </div>
            )}

            {/* Justificativa */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <label htmlFor="triagem-campo-1" className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
                Justificativa da prioridade
              </label>
              <textarea id="triagem-campo-1"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
                rows={3}
                placeholder="Descreva o motivo para a prioridade selecionada..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>

            <button
              onClick={confirmar}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--brand-green)" }}
            >
              Confirmar Triagem
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Triagem({ id }: { id: string }) {
  const chamado = useChamado(id);
  return chamado ? <TriagemConteudo key={id} chamado={chamado} /> : <ChamadoIndisponivel id={id} />;
}
