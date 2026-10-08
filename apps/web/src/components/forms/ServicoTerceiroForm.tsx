"use client";
import { useState } from "react";
import Link from "next/link";
import type { Chamado, ServicoTerceiro } from "@/types/chamado";
import { parceirosCredenciados, tiposServico } from "@/mocks/opcoes";
import { eventosServicoMock } from "@/mocks/servicos";
import { useChamados } from "@/store/ChamadosContext";
import { horaAtual } from "@/utils/date";
export default function ServicoTerceiroForm({ chamado }: { chamado: Chamado }) {
  // Serviço terceirizado
  const { vincularServico } = useChamados();
  const servicoRegistrado = chamado.servicoTerceiro;
  const [mostrarFormTerceiro, setMostrarFormTerceiro] = useState(false);
  const [formTerceiro, setFormTerceiro] = useState({
    parceiroSelecionado: "",
    parceiroManual: "",
    telefoneManual: "",
    tipoServico: "",
    local: chamado.localizacao,
    observacao: "",
  });
  const [erroForm, setErroForm] = useState("");

  const parceiroAtual = parceirosCredenciados.find((p) => p.nome === formTerceiro.parceiroSelecionado);
  const isManual = formTerceiro.parceiroSelecionado === "Outro (inserir manualmente)";

  const handleRegistrarTerceiro = () => {
    const nomeParceiro = (isManual ? formTerceiro.parceiroManual : formTerceiro.parceiroSelecionado).trim();
    if (!nomeParceiro || !formTerceiro.tipoServico) {
      setErroForm("Preencha o parceiro e o tipo de serviço.");
      return;
    }
    setErroForm("");
    const hora = horaAtual();
    const novo: ServicoTerceiro = {
      parceiro: nomeParceiro,
      telefone: isManual ? formTerceiro.telefoneManual : (parceiroAtual?.telefone || ""),
      tipoServico: formTerceiro.tipoServico,
      local: formTerceiro.local,
      observacao: formTerceiro.observacao,
      horaSolicitacao: hora, status: "solicitado", eventos: eventosServicoMock(hora, nomeParceiro), atualizacoes: [],
    };
    vincularServico(chamado.id, novo);
    setMostrarFormTerceiro(false);
  };


  return <>
            {/* Serviço Terceirizado */}
            {!servicoRegistrado && !mostrarFormTerceiro && (
              <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#F1F5F9" }}>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-[#475569] text-sm">Nenhum serviço terceirizado vinculado</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">Acione um parceiro para guincho, mecânica, elétrico ou outro serviço externo.</div>
                </div>
                <button
                  onClick={() => setMostrarFormTerceiro(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: "var(--brand-blue)" }}
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Incluir Serviço Terceirizado
                </button>
              </div>
            )}

            {!servicoRegistrado && mostrarFormTerceiro && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-blue)" }}>
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </div>
                    <h3 className="font-bold text-brand-navy text-sm" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                      Incluir Serviço Terceirizado
                    </h3>
                  </div>
                  <button
                    onClick={() => { setMostrarFormTerceiro(false); setErroForm(""); }}
                    aria-label="Fechar formulário do parceiro" className="text-[#94A3B8] hover:text-[#475569] transition-colors"
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Seleção de parceiro */}
                  <div>
                    <p className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">
                      Parceiro credenciado *
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {parceirosCredenciados.map((p) => (
                        <button
                          key={p.nome}
                          onClick={() => setFormTerceiro((f) => ({ ...f, parceiroSelecionado: p.nome, telefoneManual: "", parceiroManual: "" }))}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                          style={{
                            borderColor: formTerceiro.parceiroSelecionado === p.nome ? "#2563EB" : "#E2E8F0",
                            background: formTerceiro.parceiroSelecionado === p.nome ? "#EFF6FF" : "white",
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: formTerceiro.parceiroSelecionado === p.nome ? "#2563EB" : "#CBD5E1" }}
                          >
                            {p.nome[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: formTerceiro.parceiroSelecionado === p.nome ? "#1D4ED8" : "#1E293B" }}>
                              {p.nome}
                            </div>
                            {p.tipo && <div className="text-xs text-[#94A3B8]">{p.tipo}{p.telefone ? ` · ${p.telefone}` : ""}</div>}
                          </div>
                          {formTerceiro.parceiroSelecionado === p.nome && (
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campos manuais se "Outro" selecionado */}
                  {isManual && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: "var(--brand-light)" }}>
                      <div>
                        <label htmlFor="servico-campo-1" className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Nome do parceiro *</label>
                        <input id="servico-campo-1"
                          className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                          placeholder="Nome da empresa"
                          value={formTerceiro.parceiroManual}
                          onChange={(e) => setFormTerceiro((f) => ({ ...f, parceiroManual: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="servico-campo-2" className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Telefone</label>
                        <input id="servico-campo-2"
                          className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                          placeholder="(00) 00000-0000"
                          value={formTerceiro.telefoneManual}
                          onChange={(e) => setFormTerceiro((f) => ({ ...f, telefoneManual: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tipo de serviço */}
                  <div>
                    <p className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Tipo de serviço *</p>
                    <div className="flex flex-wrap gap-2">
                      {tiposServico.map((t) => (
                        <button
                          key={t}
                          onClick={() => setFormTerceiro((f) => ({ ...f, tipoServico: t }))}
                          className="px-3.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all"
                          style={{
                            borderColor: formTerceiro.tipoServico === t ? "#2563EB" : "#E2E8F0",
                            background: formTerceiro.tipoServico === t ? "#EFF6FF" : "white",
                            color: formTerceiro.tipoServico === t ? "#1D4ED8" : "#475569",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Local */}
                  <div>
                    <label htmlFor="servico-campo-3" className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Local do atendimento</label>
                    <input id="servico-campo-3"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                      value={formTerceiro.local}
                      onChange={(e) => setFormTerceiro((f) => ({ ...f, local: e.target.value }))}
                    />
                  </div>

                  {/* Observação */}
                  <div>
                    <label htmlFor="servico-campo-4" className="block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Observação (opcional)</label>
                    <textarea id="servico-campo-4"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
                      rows={2}
                      placeholder="Instruções adicionais para o parceiro..."
                      value={formTerceiro.observacao}
                      onChange={(e) => setFormTerceiro((f) => ({ ...f, observacao: e.target.value }))}
                    />
                  </div>

                  {erroForm && (
                    <div role="alert" className="flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {erroForm}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setMostrarFormTerceiro(false); setErroForm(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-brand-light transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRegistrarTerceiro}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                      style={{ background: "var(--brand-green)" }}
                    >
                      Acionar Parceiro
                    </button>
                  </div>
                </div>
              </div>
            )}

            {servicoRegistrado && (
              <div className="rounded-2xl border-2 border-brand-blue/20 p-6" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--brand-blue)" }}>
                      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                    </div>
                    <h3 className="font-bold text-brand-navy text-sm" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                      Serviço Terceirizado
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--brand-blue)" }} />
                      {servicoRegistrado.status === "concluido" ? "Concluído" : "Em andamento"}
                    </span>
                    <button
                      onClick={() => vincularServico(chamado.id, null)}
                      className="text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors px-1"
                      title="Remover serviço"
                    >
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/70 rounded-xl p-3.5">
                    <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Parceiro</div>
                    <div className="font-bold text-brand-dark text-sm">{servicoRegistrado.parceiro}</div>
                    {servicoRegistrado.telefone && <div className="text-xs text-[#64748B] mt-0.5">{servicoRegistrado.telefone}</div>}
                  </div>
                  <div className="bg-white/70 rounded-xl p-3.5">
                    <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Serviço</div>
                    <div className="font-bold text-brand-dark text-sm">{servicoRegistrado.tipoServico}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">Solicitado às {servicoRegistrado.horaSolicitacao}</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3.5">
                    <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Local</div>
                    <div className="font-bold text-brand-dark text-sm truncate">{servicoRegistrado.local}</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3.5">
                    <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Última atualização</div>
                    <div className="font-bold text-brand-dark text-sm">{servicoRegistrado.horaSolicitacao} · recém acionado</div>
                  </div>
                </div>

                <Link href={`/chamados/${chamado.id}/acompanhamento`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: "var(--brand-blue)" }}
                >
                  Ver acompanhamento completo
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </Link>
              </div>
            )}

  </>;
}
