"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChamados } from "@/store/ChamadosContext";
import { useChamado } from "@/hooks/useChamado";
import ChamadoIndisponivel from "@/components/feedback/ChamadoIndisponivel";
import ServicoTerceiroForm from "@/components/forms/ServicoTerceiroForm";
import AnexosInput from "@/components/forms/AnexosInput";
import TimelineChamado from "@/components/chamados/TimelineChamado";
import type { Chamado } from "@/types/chamado";
import { StatusBadge, PrioridadeBadge } from "@/components/ui/StatusBadge";

function DetalhesConteudo({ chamado }: { chamado: Chamado }) {
  const { excluirChamado: onExcluir, adicionarAnexos } = useChamados();
  const router = useRouter();
  const infoItem = (label: string, value: string) => (
    <div key={label}>
      <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm font-semibold text-brand-dark">{value || "—"}</div>
    </div>
  );

  return (
    <div className="min-w-0">

      <main id="conteudo" className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Voltar ao Dashboard"
              className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-white transition-all"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                  #{chamado.id}
                </h1>
                <StatusBadge status={chamado.status} />
                <PrioridadeBadge prioridade={chamado.prioridade} />
              </div>
              <p className="text-sm text-[#64748B]">
                {chamado.tipo} · Aberto em {chamado.abertura}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { onExcluir(chamado.id); router.push("/"); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#FECACA] text-sm font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
              title="Mover para lixeira"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
                <path d="M10,11v6" /><path d="M14,11v6" />
                <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
              </svg>
              Excluir
            </button>
            <Link href={`/chamados/${chamado.id}/triagem`}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-white transition-all"
            >
              Triagem
            </Link>
            <Link href={`/chamados/${chamado.id}/encaminhamento`}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "var(--brand-blue)" }}
            >
              Encaminhar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cliente e veículo */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
              <h3 className="font-semibold text-brand-navy text-sm mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Cliente & Veículo
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {infoItem("Cliente", chamado.cliente)}
                {infoItem("Telefone", chamado.telefone)}
                {infoItem("Veículo", chamado.modelo)}
                {infoItem("Placa", chamado.placa)}
                {infoItem("Tipo do problema", chamado.tipo)}
                {infoItem("Localização", chamado.localizacao)}
              </div>
              {chamado.descricao && (
                <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                  <div className="text-xs text-[#94A3B8] font-medium uppercase tracking-wide mb-2">Descrição</div>
                  <p className="text-sm text-[#475569] leading-relaxed">{chamado.descricao}</p>
                </div>
              )}
            </div>

            <ServicoTerceiroForm chamado={chamado} />
            <TimelineChamado chamado={chamado} />
          </div>

          {/* Sidebar info */}
          <div className="space-y-5">
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <h3 className="font-semibold text-brand-navy text-xs uppercase tracking-wide mb-4" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Situação
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-[#94A3B8] mb-1.5">Status</div>
                  <StatusBadge status={chamado.status} />
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] mb-1.5">Prioridade</div>
                  <PrioridadeBadge prioridade={chamado.prioridade} />
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] mb-1">Responsável</div>
                  <div className="text-sm font-semibold text-brand-dark">{chamado.responsavel || "Não atribuído"}</div>
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8] mb-1">Setor</div>
                  <div className="text-sm font-semibold text-brand-dark">{chamado.setor || "Não definido"}</div>
                </div>
              </div>
            </div>

            {/* SLA */}
            <div
              className="rounded-2xl p-5"
              style={{ background: chamado.sla.includes("restante") ? "#FFF7ED" : "#ECFDF5" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chamado.sla.includes("restante") ? "#EA580C" : "#059669"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: chamado.sla.includes("restante") ? "#EA580C" : "#059669" }}>
                  SLA
                </span>
              </div>
              <div className="text-lg font-bold" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: chamado.sla.includes("restante") ? "#EA580C" : "#059669" }}>
                {chamado.sla}
              </div>
            </div>

            {/* Fotos */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <h3 className="font-semibold text-brand-navy text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
                Fotos / Documentos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <div className="aspect-square rounded-lg overflow-hidden bg-[#F1F5F9]">
                  <Image width={150} height={150} unoptimized
                    src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=150&h=150&fit=crop&auto=format"
                    alt="Foto do veículo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-square rounded-lg overflow-hidden bg-[#F1F5F9]">
                  <Image width={150} height={150} unoptimized
                    src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&auto=format"
                    alt="Local do problema"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <AnexosInput compacto anexos={chamado.anexos} onAdicionar={(novos) => adicionarAnexos(chamado.id, novos)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DetalhesChamado({ id }: { id: string }) {
  const chamado = useChamado(id);
  return chamado ? <DetalhesConteudo key={id} chamado={chamado} /> : <ChamadoIndisponivel id={id} />;
}
