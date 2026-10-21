"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { Chamado, Localizacao } from "@/types/chamado";
import { registrarLocalizacao } from "@/services/api/chamados";
import { useAcaoNoChamado } from "@/hooks/consultas";
import CampoDeLocalizacao, { descreverCoordenadas } from "@/components/forms/CampoDeLocalizacao";
import { AvisoDeErro } from "@/components/feedback/EstadoDaConsulta";
import { completarLocalizacao, formatarCep, linkNoOpenStreetMap, temCoordenadas, temEnderecoEstruturado } from "@/utils/endereco";

const inputClass = "w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue";

export function enderecoNoMapa(localizacao: Pick<Localizacao, "endereco" | "latitude" | "longitude">) {
  const consulta = localizacao.latitude !== null && localizacao.longitude !== null
    ? `${localizacao.latitude},${localizacao.longitude}`
    : localizacao.endereco;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

function EnderecoRegistrado({ localizacao }: { localizacao: Localizacao }) {
  if (!temEnderecoEstruturado(localizacao)) {
    return <p className="break-words text-sm font-semibold text-brand-dark">{localizacao.endereco}</p>;
  }
  const rua = [localizacao.logradouro.trim(), localizacao.numero.trim()].filter(Boolean).join(", ");
  const regiao = [localizacao.bairro.trim(), [localizacao.cidade.trim(), localizacao.uf.trim()].filter(Boolean).join(" – ")]
    .filter(Boolean)
    .join(" · ");
  const cep = localizacao.cep.replace(/\D/g, "");
  return (
    <div className="min-w-0 space-y-0.5">
      {rua && <p className="break-words text-sm font-semibold text-brand-dark">{rua}</p>}
      {localizacao.complemento.trim() && <p className="break-words text-xs text-slate-600">{localizacao.complemento}</p>}
      {regiao && <p className="break-words text-xs text-slate-600">{regiao}</p>}
      {cep.length === 8 && <p className="text-xs text-slate-500">CEP {formatarCep(cep)}</p>}
    </div>
  );
}

export default function LocalizacaoDoChamado({ chamado, somenteLeitura = false }: { chamado: Chamado; somenteLeitura?: boolean }) {
  const atual = chamado.localizacaoDetalhada ? completarLocalizacao(chamado.localizacaoDetalhada) : null;
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Localizacao>(() => completarLocalizacao(chamado.localizacaoDetalhada));
  const salvar = useAcaoNoChamado(chamado.id, (api, localizacao: Localizacao) => registrarLocalizacao(api, chamado.id, localizacao));

  function comecarEdicao() {
    setRascunho(completarLocalizacao(chamado.localizacaoDetalhada));
    setEditando(true);
  }

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5" aria-labelledby={`local-${chamado.id}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id={`local-${chamado.id}`} className="font-display text-xs font-semibold uppercase tracking-wide text-brand-navy">Localização</h3>
        {!editando && !somenteLeitura && (
          <button type="button" onClick={comecarEdicao} className="text-xs font-semibold text-brand-blue hover:underline">
            {atual ? "Atualizar" : "Registrar"}
          </button>
        )}
      </div>
      {atual ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-red-500" aria-hidden />
            <EnderecoRegistrado localizacao={atual} />
          </div>
          {temCoordenadas(atual) && (
            <p className="text-xs text-slate-500">GPS: {descreverCoordenadas(atual.latitude, atual.longitude)}</p>
          )}
          <a
            href={temCoordenadas(atual) ? linkNoOpenStreetMap(atual.latitude, atual.longitude) : enderecoNoMapa(atual)}
            target="_blank"
            rel="noreferrer"
            className="alvo-toque inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
          >
            {temCoordenadas(atual) ? "Abrir no mapa (OpenStreetMap)" : "Abrir no mapa"} <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      ) : (
        !editando && <p className="text-xs text-slate-400">Nenhuma localização registrada.</p>
      )}
      {editando && (
        <div className="mt-3 space-y-3">
          <CampoDeLocalizacao id={`local-campo-${chamado.id}`} valor={rascunho} aoAlterar={setRascunho} inputClassName={inputClass} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditando(false)} className="alvo-toque flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
            <button
              type="button"
              disabled={salvar.isPending || (!rascunho.endereco.trim() && rascunho.latitude === null)}
              onClick={() => salvar.mutate(rascunho, { onSuccess: () => setEditando(false) })}
              className="alvo-toque flex-1 rounded-lg bg-brand-green py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {salvar.isPending ? "Salvando…" : "Salvar localização"}
            </button>
          </div>
          {salvar.isError && <AvisoDeErro erro={salvar.error} />}
        </div>
      )}
    </section>
  );
}
