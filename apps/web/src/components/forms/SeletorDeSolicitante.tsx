"use client";

import { useDeferredValue, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Solicitante } from "@/types/chamado";
import { listarSolicitantes } from "@/services/api/operacao";
import { useApi } from "@/store/AuthContext";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";

interface Props {
  id: string;
  valor: string;
  aoEscolher: (solicitante: Solicitante | null) => void;
  selectClassName: string;
  invalido: boolean;
  descricaoDoErro?: string;
}

function rotuloDo(solicitante: Solicitante) {
  return [solicitante.nome, solicitante.email, solicitante.organizacao].filter(Boolean).join(" · ");
}

export default function SeletorDeSolicitante({ id, valor, aoEscolher, selectClassName, invalido, descricaoDoErro }: Props) {
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
        className={selectClassName}
      />
      <select
        id={id}
        className={selectClassName}
        value={valor}
        aria-invalid={invalido ? true : undefined}
        aria-describedby={descricaoDoErro}
        onChange={(evento) => {
          const solicitante = opcoes.find((item) => item.id === evento.target.value) ?? null;
          setEscolhido(solicitante);
          aoEscolher(solicitante);
        }}
      >
        <option value="">{consulta.isPending ? "Carregando clientes…" : "Selecione o cliente"}</option>
        {opcoes.map((solicitante) => <option key={solicitante.id} value={solicitante.id}>{rotuloDo(solicitante)}</option>)}
      </select>
      {consulta.isError && <p className="text-xs font-medium text-red-600">Não foi possível carregar os clientes. {mensagemDeErro(consulta.error)}</p>}
      {consulta.isSuccess && encontrados.length === 0 && (
        <p className="text-xs text-slate-500">Nenhum cliente encontrado. Cadastre um usuário com perfil Cliente ou Gestor de frota em Usuários.</p>
      )}
    </div>
  );
}
