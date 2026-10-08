"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CirclePlus, ClipboardList, Hourglass, Search, Trash, TriangleAlert, Zap } from "lucide-react";
import { useChamados } from "@/store/ChamadosContext";
import { statuses } from "@/mocks/opcoes";
import { useState } from "react";
import { StatusBadge, PrioridadeBadge } from "@/components/ui/StatusBadge";

const filtrosStatus = ["Todos", ...statuses.filter((status) => status !== "Encerrado")];
const prioridades = ["Todas", "Crítica", "Alta", "Média", "Baixa"];

export default function Dashboard() {
  const { chamados, excluirChamado: onExcluir } = useChamados();
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPrioridade, setFilterPrioridade] = useState("Todas");
  const [search, setSearch] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const total = chamados.length;
  const criticos = chamados.filter((c) => c.prioridade === "Crítica").length;
  const emAtendimento = chamados.filter((c) => c.status === "Em atendimento").length;
  const aguardando = chamados.filter((c) => c.status === "Aguardando").length;

  const filtered = chamados.filter((c) => {
    const matchStatus = filterStatus === "Todos" || c.status === filterStatus;
    const matchPrio = filterPrioridade === "Todas" || c.prioridade === filterPrioridade;
    const matchSearch =
      !search ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.toLowerCase().includes(search.toLowerCase()) ||
      c.modelo.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPrio && matchSearch;
  });

  const handleExcluir = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmandoId === id) {
      onExcluir(id);
      setConfirmandoId(null);
    } else {
      setConfirmandoId(id);
    }
  };

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
              Dashboard
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">Central de Chamados · ViaFlux Mobilidade</p>
          </div>
          <Link href="/chamados/novo"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--brand-green)" }}
          >
            <CirclePlus size={16} strokeWidth={2.5} />
            Novo Chamado
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {[
            { label: "Total de chamados", value: total, icon: ClipboardList, color: "#0F2C59", bg: "#EFF6FF" },
            { label: "Críticos", value: criticos, icon: TriangleAlert, color: "#DC2626", bg: "#FEF2F2" },
            { label: "Em atendimento", value: emAtendimento, icon: Zap, color: "#059669", bg: "#ECFDF5" },
            { label: "Aguardando", value: aguardando, icon: Hourglass, color: "#7C3AED", bg: "#F5F3FF" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 border border-[#E2E8F0] bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#64748B] font-medium">{stat.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                  <stat.icon size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
              <input
                type="text"
                aria-label="Buscar chamados"
                placeholder="Buscar por nº, cliente ou veículo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E2E8F0] outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#94A3B8] font-medium">Status:</span>
              {filtrosStatus.map((s) => (
                <button
                  key={s}
                  aria-pressed={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: filterStatus === s ? "#0F2C59" : "#F1F5F9", color: filterStatus === s ? "#fff" : "#64748B" }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#94A3B8] font-medium">Prioridade:</span>
              {prioridades.map((p) => (
                <button
                  key={p}
                  aria-pressed={filterPrioridade === p}
                  onClick={() => setFilterPrioridade(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: filterPrioridade === p ? "#0F2C59" : "#F1F5F9", color: filterPrioridade === p ? "#fff" : "#64748B" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy text-sm" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
              Chamados Recentes
            </h2>
            <span className="text-xs text-[#94A3B8]">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto"><table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-brand-light">
                {["Nº chamado", "Cliente / Veículo", "Tipo", "Localização", "Status", "Prioridade", "SLA", "Ações"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-brand-light transition-colors cursor-pointer"
                  onClick={() => router.push(`/chamados/${c.id}`)}
                >
                  <td className="px-5 py-4">
                    <Link href={`/chamados/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-brand-blue text-sm">#{c.id}</Link>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-brand-dark text-sm">{c.cliente}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">{c.modelo} · {c.placa}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[#475569]">{c.tipo}</td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-[#475569] max-w-36 truncate">{c.localizacao}</div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-4"><PrioridadeBadge prioridade={c.prioridade} /></td>
                  <td className="px-5 py-4 text-sm text-[#64748B]">{c.sla}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/chamados/${c.id}`} onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-brand-blue hover:underline"
                      >Ver</Link>
                      {confirmandoId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleExcluir(c.id, e)}
                            className="text-xs font-semibold text-white px-2 py-0.5 rounded"
                            style={{ background: "#DC2626" }}
                          >
                            Confirmar
                          </button>
                          <button
                            aria-label="Cancelar exclusão" onClick={(e) => { e.stopPropagation(); setConfirmandoId(null); }}
                            className="text-xs text-[#94A3B8] hover:text-[#64748B]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleExcluir(c.id, e)}
                          className="text-[#CBD5E1] hover:text-[#EF4444] transition-colors"
                          title="Excluir chamado" aria-label={`Excluir chamado ${c.id}`}
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#94A3B8] text-sm">
                    Nenhum chamado encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </main>
    </div>
  );
}
