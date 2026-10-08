"use client";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import type { Anexo } from "@/types/chamado";
import { useChamados } from "@/store/ChamadosContext";
import { dataHoraAtual, horaAtual } from "@/utils/date";
import AnexosInput from "@/components/forms/AnexosInput";
import { useState } from "react";
import type { Chamado } from "@/types/chamado";

export default function NovoChamado() {
  const { proximoId: novoId, adicionarChamado: onCriar } = useChamados();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [form, setForm] = useState({
    cliente: "",
    telefone: "",
    modelo: "",
    placa: "",
    tipo: "",
    descricao: "",
    localizacao: "",
  });
  const [confirmado, setConfirmado] = useState(false);
  const [novoChamadoId, setNovoChamadoId] = useState("");


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.cliente.trim() || !form.modelo.trim() || !form.tipo) return;
    const dataStr = dataHoraAtual();
    const novo: Chamado = {
      id: novoId,
      cliente: form.cliente.trim(),
      telefone: form.telefone,
      modelo: form.modelo.trim(),
      placa: form.placa.toUpperCase(),
      tipo: form.tipo,
      descricao: form.descricao,
      localizacao: form.localizacao,
      status: "Aberto",
      prioridade: "Média",
      setor: "",
      responsavel: "",
      abertura: dataStr,
      sla: "8h restantes",
      timeline: [{ hora: horaAtual(), acao: "Chamado aberto", detalhe: "Registrado por João Matos · Central ViaFlux", icon: "aberto" }], historico: [], servicoTerceiro: null, anexos,
    };
    onCriar(novo);
    setNovoChamadoId(novoId);
    setConfirmado(true);
  };

  const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all";

  if (confirmado) {
    return (
      <div className="min-w-0">
        <main id="conteudo" className="min-h-[70vh] md:min-h-screen flex items-center justify-center p-4 md:p-8">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center shadow-sm">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "#ECFDF5" }}
            >
              <Check size={32} color="#10B981" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-brand-navy mb-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
              Chamado aberto!
            </h2>
            <p className="text-[#64748B] text-sm mb-1">
              Seu chamado foi registrado com sucesso.
            </p>
            <p className="text-brand-blue font-bold text-lg mb-6">#{novoChamadoId}</p>
            <p className="text-xs text-[#94A3B8] mb-8">
              Em breve nossa equipe entrará em contato. O SLA de atendimento é de até 8 horas.
            </p>
            <div className="flex gap-3">
              <Link href="/"
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-brand-light transition-colors"
              >
                Ir ao Dashboard
              </Link>
              <button
                onClick={() => { setConfirmado(false); setAnexos([]); setForm({ cliente: "", telefone: "", modelo: "", placa: "", tipo: "", descricao: "", localizacao: "" }); }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "var(--brand-green)" }}
              >
                Novo chamado
              </button>
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
            <Link href="/" aria-label="Voltar ao Dashboard"
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white hover:border-[#CBD5E1] transition-all"
            >
              <ChevronLeft size={16} />
            </Link>
            <div>
              <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Nº do chamado</div>
              <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                #{novoId} — Novo Chamado
              </h1>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
            {/* Dados do cliente */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                <span className="w-6 h-6 rounded-md bg-[#EFF6FF] flex items-center justify-center text-brand-blue text-xs font-bold">1</span>
                Dados do Cliente
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="novo-campo-1" className={labelClass}>Nome *</label>
                  <input id="novo-campo-1" className={inputClass} placeholder="Nome completo" required value={form.cliente} onChange={set("cliente")} />
                </div>
                <div>
                  <label htmlFor="novo-campo-2" className={labelClass}>Telefone</label>
                  <input id="novo-campo-2" className={inputClass} type="tel" placeholder="(00) 00000-0000" value={form.telefone} onChange={set("telefone")} />
                </div>
              </div>
            </div>

            {/* Dados do veículo */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                <span className="w-6 h-6 rounded-md bg-[#EFF6FF] flex items-center justify-center text-brand-blue text-xs font-bold">2</span>
                Dados do Veículo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="novo-campo-3" className={labelClass}>Modelo *</label>
                  <input id="novo-campo-3" className={inputClass} placeholder="Ex: Volvo FH 460" required value={form.modelo} onChange={set("modelo")} />
                </div>
                <div>
                  <label htmlFor="novo-campo-4" className={labelClass}>Placa</label>
                  <input id="novo-campo-4" className={inputClass} placeholder="ABC-1D23" value={form.placa} onChange={set("placa")} />
                </div>
              </div>
            </div>

            {/* Problema */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-5 flex items-center gap-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                <span className="w-6 h-6 rounded-md bg-[#EFF6FF] flex items-center justify-center text-brand-blue text-xs font-bold">3</span>
                Problema
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="novo-campo-5" className={labelClass}>Tipo do problema *</label>
                  <select id="novo-campo-5" className={inputClass} required value={form.tipo} onChange={set("tipo")}>
                    <option value="">Selecione</option>
                    <option>Mecânico</option>
                    <option>Sistema</option>
                    <option>Financeiro</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="novo-campo-6" className={labelClass}>Descrição</label>
                  <textarea id="novo-campo-6"
                    className={inputClass + " resize-none"}
                    rows={3}
                    placeholder="Descreva o problema com o máximo de detalhes..."
                    value={form.descricao}
                    onChange={set("descricao")}
                  />
                </div>
                <div>
                  <label htmlFor="novo-campo-7" className={labelClass}>Localização</label>
                  <input id="novo-campo-7"
                    className={inputClass}
                    placeholder="Ex: BR-116, km 312, Guarulhos – SP"
                    value={form.localizacao}
                    onChange={set("localizacao")}
                  />
                </div>
              </div>
            </div>

            {/* Upload */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h2 className="font-semibold text-brand-navy text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                <span className="w-6 h-6 rounded-md bg-[#EFF6FF] flex items-center justify-center text-brand-blue text-xs font-bold">4</span>
                Anexos (opcional)
              </h2>
              <AnexosInput anexos={anexos} onAdicionar={(novos) => setAnexos((itens) => [...itens, ...novos])} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!form.cliente.trim() || !form.modelo.trim() || !form.tipo}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--brand-green)" }}
            >
              Abrir Chamado
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
