"use client";

import { useDeferredValue, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Solicitante } from "@/types/chamado";
import { listarSolicitantes } from "@/services/api/operacao";
import { useApi } from "@/store/AuthContext";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import Select, { type OpcaoDoSelect } from "@/components/ui/Select";

interface Props {
  id: string;
  valor: string;
  aoEscolher: (solicitante: Solicitante | null) => void;
  buscaClassName: string;
  invalido: boolean;
  descricaoDoErro?: string;
}

const OPCAO_SEM_SOLICITANTE: OpcaoDoSelect = { valor: "", rotulo: "Nenhum" };

function opcaoDo(solicitante: Solicitante): OpcaoDoSelect {
  return {
    valor: solicitante.id,
    rotulo: solicitante.nome,
    descricao: [solicitante.email, solicitante.organizacao].filter(Boolean).join(" · ") || undefined,
  };
}

export default function SeletorDeSolicitante({ id, valor, aoEscolher, buscaClassName, invalido, descricaoDoErro }: Props) {
  const api = useApi();
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<Solicitante | null>(null);
  const buscaAdiada = useDeferredValue(busca.trim());
  const consulta = useQuery({
    queryKey: ["solicitantes", buscaAdiada],
    queryFn: () => listarSolicitantes(api, buscaAdiada),
    placeholderData: keepPreviousData,
  });
  const encontrados = consulta.data ?? [];
  const opcoes = escolhido && escolhido.id === valor && !encontrados.some((item) => item.id === escolhido.id) ? [escolhido, ...encontrados] : encontrados;

  return (
    <div className="space-y-2">
      <input
        type="search"
        aria-label="Buscar cliente por nome ou e-mail"
        placeholder="Buscar cliente por nome ou e-mail…"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        className={buscaClassName}
      />
      <Select
        id={id}
        value={valor}
        aria-invalid={invalido ? true : undefined}
        aria-describedby={descricaoDoErro}
        placeholder={consulta.isPending ? "Carregando clientes…" : "Selecione o cliente"}
        opcoes={valor ? [OPCAO_SEM_SOLICITANTE, ...opcoes.map(opcaoDo)] : opcoes.map(opcaoDo)}
        onChange={(escolha) => {
          const solicitante = opcoes.find((item) => item.id === escolha) ?? null;
          setEscolhido(solicitante);
          aoEscolher(solicitante);
        }}
      />
      {consulta.isError && <p className="text-xs font-medium text-red-600">Não foi possível carregar os clientes. {mensagemDeErro(consulta.error)}</p>}
      {consulta.isSuccess && encontrados.length === 0 && (
        <p className="text-xs text-slate-500">Nenhum cliente encontrado.</p>
      )}
    </div>
  );
}
