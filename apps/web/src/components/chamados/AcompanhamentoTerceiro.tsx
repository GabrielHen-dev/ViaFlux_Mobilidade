"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, CircleX, MapPin, MessageSquare, Phone, Star } from "lucide-react";
import type { ServicoTerceiro } from "@/types/chamado";
import { statusConfig } from "@/components/ui/StatusServico";
import { useChamados } from "@/store/ChamadosContext";
import { useChamado } from "@/hooks/useChamado";
import ChamadoIndisponivel from "@/components/feedback/ChamadoIndisponivel";
import { useState, useEffect } from "react";
import type { Chamado } from "@/types/chamado";
import { parceirosDetalhesMock, prazosServicoMock } from "@/mocks/servicos";

function AcompanhamentoConteudo({ chamado, servico }: { chamado: Chamado; servico: ServicoTerceiro }) {
  const { registrarObservacaoParceiro, vincularServico } = useChamados();
  const router = useRouter();
  const atualizacoes = servico.atualizacoes;
  const timelineServico = servico.eventos;
  const parceiroInfo = parceirosDetalhesMock[servico.parceiro];
  const [observacao, setObservacao] = useState("");
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!salvo) return;
    const timeout = setTimeout(() => setSalvo(false), 3000);
    return () => clearTimeout(timeout);
  }, [salvo]);

  const statusAtual = statusConfig[servico.status];

  const handleAtualizar = () => {
    if (!observacao.trim()) return;
    registrarObservacaoParceiro(chamado.id, observacao);
    setObservacao("");
    setSalvo(true);

  };

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`}
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white transition-all bg-white"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
                  #{chamado.id}
                </span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-xs font-semibold text-[#94A3B8]">Serviço Terceirizado</span>
              </div>
              <h1 className="text-xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Acompanhamento do Serviço
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">
                {chamado.modelo} · {chamado.cliente} · {chamado.localizacao}
              </p>
            </div>
          </div>

          {/* Status atual destacado */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2"
            style={{ background: statusAtual.bg, borderColor: statusAtual.cor + "40" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: statusAtual.cor, color: "white" }}
            >
              {statusAtual.icone}
            </div>
            <div>
              <div className="text-xs text-[#64748B] font-medium">Status atual</div>
              <div className="font-bold text-sm" style={{ color: statusAtual.cor }}>
                {statusAtual.label}
              </div>
            </div>
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse ml-1"
              style={{ background: statusAtual.cor }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-5">
            {/* Card do parceiro */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <div className="flex items-start justify-between mb-5">
                <h3 className="font-bold text-brand-navy text-sm" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Parceiro Responsável
                </h3>
                <span className="text-xs text-[#94A3B8]">Encaminhado em {chamado.abertura.split(" às ")[0]} às {servico.horaSolicitacao}</span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 rounded-xl mb-5" style={{ background: "var(--brand-light)" }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0F2C59, #2563EB)" }}
                >
                  {servico.parceiro.split(" ").map((nome) => nome[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1 break-words">
                  <div className="font-bold text-brand-dark">{servico.parceiro}</div>
                  <div className="text-sm text-[#64748B] mt-0.5">Parceiro credenciado · Assistência 24h</div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {parceiroInfo
                      ? <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8]"><Star size={12} className="fill-amber-400 text-amber-400" />{parceiroInfo.avaliacao}</span>
                      : <span className="text-xs text-[#94A3B8]">Parceiro vinculado</span>}
                    <span className="text-xs text-[#94A3B8]">·</span>
                    <span className="text-xs text-[#94A3B8]">{parceiroInfo?.documento ?? "Dados a confirmar"}</span>
                  </div>
                </div>
                <a
                  href={`tel:+55${servico.telefone.replace(/\D/g, "")}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: "var(--brand-green)" }}
                >
                  <Phone size={12} strokeWidth={2.5} />
                  Ligar
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Motorista</div>
                  <div className="text-sm font-semibold text-brand-dark">{parceiroInfo?.motorista ?? "A definir"}</div>
                  <div className="text-xs text-[#64748B]">{parceiroInfo?.veiculo ?? "Aguardando parceiro"}</div>
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Tipo de serviço</div>
                  <div className="text-sm font-semibold text-brand-dark">{servico.tipoServico}</div>
                  <div className="text-xs text-[#64748B]">{parceiroInfo?.modalidade ?? "A confirmar"}</div>
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">Previsão chegada</div>
                  <div className="text-sm font-bold" style={{ color: "#2563EB" }}>{parceiroInfo?.chegada ?? "—"}</div>
                  <div className="text-xs text-[#64748B]">{parceiroInfo?.distancia ?? "Aguardando previsão"}</div>
                </div>
              </div>
            </div>

            {/* Timeline do serviço */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h3 className="font-bold text-brand-navy text-sm mb-6" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Linha do Tempo do Serviço
              </h3>

              <div className="relative">
                {/* Linha vertical contínua */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5" style={{ background: "linear-gradient(to bottom, #10B981 60%, #E2E8F0 60%)" }} />

                <div className="space-y-0">
                  {timelineServico.map((evento, i) => {
                    const cfg = statusConfig[evento.status];
                    const isAtual = evento.atual;
                    const isProximo = evento.proximo;
                    const isFuturo = !evento.concluido && !isAtual && !isProximo;

                    return (
                      <div key={i} className="flex gap-4 relative pb-6 last:pb-0">
                        {/* Nó da timeline */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 relative transition-all"
                          style={{
                            background: evento.concluido
                              ? "#10B981"
                              : isAtual
                              ? "#2563EB"
                              : isProximo
                              ? "#F8FAFC"
                              : "#F1F5F9",
                            border: isAtual
                              ? "3px solid #2563EB"
                              : isProximo
                              ? "2px dashed #CBD5E1"
                              : evento.concluido
                              ? "none"
                              : "2px solid #E2E8F0",
                            boxShadow: isAtual ? "0 0 0 4px rgba(37,99,235,0.15)" : "none",
                          }}
                        >
                          {evento.concluido ? (
                            <Check size={14} color="white" strokeWidth={3} />
                          ) : isAtual ? (
                            <span style={{ color: "white" }}>{cfg.icone}</span>
                          ) : (
                            <span className="text-sm" style={{ color: "#CBD5E1" }}>{i + 1}</span>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div
                          className="flex-1 rounded-xl p-4 transition-all"
                          style={{
                            background: isAtual ? "#EFF6FF" : evento.concluido ? "#F8FAFC" : "transparent",
                            border: isAtual ? "1.5px solid #BFDBFE" : "none",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-bold text-sm"
                                style={{
                                  color: evento.concluido
                                    ? "#059669"
                                    : isAtual
                                    ? "#1D4ED8"
                                    : "#94A3B8",
                                }}
                              >
                                {evento.titulo}
                              </span>
                              {isAtual && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--brand-blue)" }}/>
                                  Agora
                                </span>
                              )}
                              {isProximo && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#FEF9C3", color: "#A16207" }}>
                                  Próxima etapa
                                </span>
                              )}
                              {evento.concluido && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#D1FAE5", color: "#065F46" }}>
                                  Concluído
                                </span>
                              )}
                            </div>
                            <span
                              className="text-xs font-mono font-semibold"
                              style={{ color: evento.hora === "—" ? "#CBD5E1" : evento.concluido ? "#059669" : isAtual ? "#2563EB" : "#94A3B8" }}
                            >
                              {evento.hora}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: isFuturo ? "#CBD5E1" : "#64748B" }}>
                            {evento.detalhe}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Observações e atualização */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h3 className="font-bold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Observações do Atendimento
              </h3>

              {atualizacoes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {atualizacoes.map((a, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--brand-light)" }}>
                      <span className="text-xs font-mono text-[#94A3B8] flex-shrink-0 pt-0.5">{a.hora}</span>
                      <p className="text-sm text-[#475569]">{a.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
                  rows={3}
                  aria-label="Observação do atendimento do parceiro" placeholder="Registre uma observação sobre o atendimento do parceiro..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
                <div className="flex flex-col gap-2 justify-end">
                  <button
                    onClick={handleAtualizar}
                    disabled={!observacao.trim()}
                    className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                    style={{ background: "var(--brand-green)" }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
              {salvo && (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: "#059669" }}>
                  <Check size={12} strokeWidth={3} />
                  Observação registrada com sucesso
                </div>
              )}
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            {/* Localização */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="p-4 border-b border-[#F1F5F9]">
                <h3 className="font-bold text-brand-navy text-xs uppercase tracking-wide" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  Local do Atendimento
                </h3>
              </div>
              <div className="relative h-36 bg-[#E2E8F0]">
                <Image width={400} height={200} unoptimized
                  src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&h=200&fit=crop&auto=format"
                  alt="Mapa da localização"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#EF4444" }}>
                      <MapPin size={10} color="white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-semibold text-brand-dark">{servico.local.split(",").slice(0, 2).join(",")}</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold text-brand-dark">{servico.local.split(",").slice(0, 2).join(",")}</div>
                <div className="text-xs text-[#64748B] mt-0.5">{servico.local.split(",").slice(2).join(",").trim()}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-brand-blue font-medium">
                  <MapPin size={11} strokeWidth={2.5} />
                  Ver no mapa
                </div>
              </div>
            </div>

            {/* Resumo de prazos */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <h3 className="font-bold text-brand-navy text-xs uppercase tracking-wide mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Prazos & Previsões
              </h3>
              <div className="space-y-3">
                {prazosServicoMock(servico).map((p) => (
                  <div key={p.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-4 text-center font-bold" style={{ color: p.cor }}>{p.icone}</span>
                      <span className="text-xs text-[#64748B]">{p.label}</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: p.cor }}>{p.valor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Integração com histórico do chamado */}
            <div className="rounded-2xl p-4" style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0" }}>
              <div className="flex items-start gap-2">
                <Check size={14} color="#059669" strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#065F46] mb-0.5">Integrado ao histórico</div>
                  <p className="text-xs text-[#047857] leading-relaxed">
                    Todas as atualizações do parceiro são registradas automaticamente na timeline do chamado #{chamado.id}.
                  </p>
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <h3 className="font-bold text-brand-navy text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Ações Rápidas
              </h3>
              <div className="space-y-2">
                <button onClick={() => registrarObservacaoParceiro(chamado.id, "Contato telefônico com o parceiro solicitado pela Central ViaFlux.")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-dark hover:bg-brand-light transition-colors border border-[#E2E8F0] text-left">
                  <Phone size={14} color="#2563EB" strokeWidth={2.5} />
                  Ligar para o parceiro
                </button>
                <button onClick={() => registrarObservacaoParceiro(chamado.id, "Atualização solicitada ao parceiro pela Central ViaFlux.")} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-dark hover:bg-brand-light transition-colors border border-[#E2E8F0] text-left">
                  <MessageSquare size={14} color="#7C3AED" strokeWidth={2.5} />
                  Solicitar atualização
                </button>
                <button onClick={() => { vincularServico(chamado.id, null); router.push(`/chamados/${chamado.id}`); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2] transition-colors border border-[#FECACA] text-left">
                  <CircleX size={14} color="#EF4444" strokeWidth={2.5} />
                  Cancelar serviço
                </button>
              </div>
            </div>

            {/* Voltar ao chamado */}
            <Link aria-label="Voltar ao chamado" href={`/chamados/${chamado.id}`}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-white hover:border-[#CBD5E1] transition-all"
            >
              <ChevronLeft size={14} />
              Voltar ao chamado
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AcompanhamentoTerceiro({ id }: { id: string }) {
  const chamado = useChamado(id);
  if (!chamado) return <ChamadoIndisponivel id={id} />;
  if (!chamado.servicoTerceiro) return <main id="conteudo" className="p-4 md:p-8"><div className="rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-xl font-bold text-brand-navy">Nenhum serviço terceirizado vinculado</h1><Link className="mt-4 inline-block text-sm font-semibold text-brand-blue" href={`/chamados/${id}`}>Voltar ao chamado</Link></div></main>;
  return <AcompanhamentoConteudo key={id} chamado={chamado} servico={chamado.servicoTerceiro} />;
}
