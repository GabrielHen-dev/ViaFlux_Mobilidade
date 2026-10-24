"use client";

import { useMemo, useState, type FormEvent, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Chamado } from "@/types/chamado";
import { abrirChamado, enviarAnexo } from "@/services/api/chamados";
import { ErroApi } from "@/services/api/cliente";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { invalidarListas } from "@/hooks/consultas";
import { useRascunho } from "@/hooks/useRascunho";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { completarLocalizacao, LOCALIZACAO_VAZIA, temCoordenadas, temEnderecoEstruturado } from "@/utils/endereco";
import { gerarId } from "@/utils/id";
import {
  type AlterarCampo, type ArquivoPendente, type CampoDoFormulario, type CamposDoRascunho, type ErrosDoFormulario, type Rascunho,
  esquemaDaCentral, esquemaDeAbertura, rascunhoVazio,
} from "@/components/forms/novo-chamado/formulario";

interface Opcoes {
  abrePelaCentral: boolean;
  nomeInicial: string;
  resumoDosErros: RefObject<HTMLDivElement | null>;
  avisoDeFalha: RefObject<HTMLDivElement | null>;
}

function sanitizarRascunho(rascunho: Rascunho): Rascunho {
  return { ...rascunho, campos: { ...rascunho.campos, localizacao: LOCALIZACAO_VAZIA } };
}

export function useAberturaDeChamado({ abrePelaCentral, nomeInicial, resumoDosErros, avisoDeFalha }: Opcoes) {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const clienteDeConsultas = useQueryClient();
  const rascunhoInicial = useMemo(() => rascunhoVazio(nomeInicial), [nomeInicial]);
  const { valor: rascunho, setValor: setRascunho, restaurado, descartar } = useRascunho<Rascunho>(`novo-chamado:${usuario.id}`, rascunhoInicial, sanitizarRascunho);
  const campos: CamposDoRascunho = { ...rascunho.campos, motivoOutro: rascunho.campos.motivoOutro ?? "", localizacao: completarLocalizacao(rascunho.campos.localizacao) };
  const [arquivos, setArquivos] = useState<ArquivoPendente[]>([]);
  const [erros, setErros] = useState<ErrosDoFormulario>({});
  const [falhaDoEnvio, setFalhaDoEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<Chamado | null>(null);

  const limparErros = (...alterados: CampoDoFormulario[]) => setErros((anteriores) => ({ ...anteriores, ...Object.fromEntries(alterados.map((campo) => [campo, undefined])) }));

  const alterar: AlterarCampo = (campo, valor) => {
    setRascunho((anterior) => ({ ...anterior, campos: { ...anterior.campos, [campo]: valor } }));
    limparErros(campo === "localizacao" ? "endereco" : campo);
  };

  function escolherMotivo(motivoId: string, manterContexto: boolean) {
    setRascunho((anterior) => ({ ...anterior, campos: { ...anterior.campos, motivoId, contextoId: manterContexto ? anterior.campos.contextoId : "" } }));
    limparErros("motivoId");
  }

  function escolherSolicitante(solicitante: { id: string; nome: string; organizacao: string | null } | null) {
    setRascunho((anterior) => ({
      ...anterior,
      campos: { ...anterior.campos, solicitanteId: solicitante?.id ?? "", cliente: solicitante ? solicitante.organizacao ?? solicitante.nome : anterior.campos.cliente },
    }));
    limparErros("solicitanteId", "cliente");
  }

  const atualizarArquivo = (id: string, mudanca: Partial<ArquivoPendente>) =>
    setArquivos((lista) => lista.map((atual) => (atual.id === id ? { ...atual, ...mudanca } : atual)));

  async function enviarAnexos(codigo: string, pendentes: ArquivoPendente[]) {
    for (const item of pendentes) {
      atualizarArquivo(item.id, { situacao: "enviando", erro: undefined });
      try {
        await enviarAnexo(api, codigo, item.arquivo, item.id);
        atualizarArquivo(item.id, { situacao: "enviado" });
      } catch (erro) {
        atualizarArquivo(item.id, { situacao: "falhou", erro: mensagemDeErro(erro) });
      }
    }
    void invalidarListas(clienteDeConsultas);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFalhaDoEnvio(null);
    const validacao = (abrePelaCentral ? esquemaDaCentral : esquemaDeAbertura).safeParse({ ...campos, endereco: campos.localizacao.endereco });
    if (!validacao.success) {
      const encontrados: ErrosDoFormulario = {};
      for (const problema of validacao.error.issues) encontrados[problema.path[0] as CampoDoFormulario] ??= problema.message;
      setErros(encontrados);
      queueMicrotask(() => resumoDosErros.current?.focus());
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      const dados = validacao.data;
      const informouLocalizacao = dados.endereco !== "" || temCoordenadas(campos.localizacao) || temEnderecoEstruturado(campos.localizacao);
      const chamado = await abrirChamado(api, {
        solicitanteId: dados.solicitanteId || undefined,
        motivoId: dados.motivoId,
          contextoId: dados.motivoId === "OUTRO" ? null : dados.contextoId,
          motivoOutro: dados.motivoId === "OUTRO" ? dados.motivoOutro.trim() : undefined,
        descricao: dados.descricao,
        cliente: dados.cliente,
        telefone: dados.telefone,
        modelo: dados.modelo,
        placa: dados.placa.toUpperCase(),
        localizacao: informouLocalizacao ? { ...campos.localizacao, endereco: dados.endereco } : null,
      }, rascunho.chaveIdempotencia);
      setCriado(chamado);
      descartar(rascunhoVazio(nomeInicial));
      void invalidarListas(clienteDeConsultas);
      await enviarAnexos(chamado.id, arquivos);
    } catch (erro) {
      if (erro instanceof ErroApi && Object.keys(erro.campos).length > 0) setErros(erro.campos as ErrosDoFormulario);
      setFalhaDoEnvio(mensagemDeErro(erro));
      queueMicrotask(() => avisoDeFalha.current?.focus());
    } finally {
      setEnviando(false);
    }
  }

  return {
    campos,
    erros,
    arquivos,
    restaurado,
    falhaDoEnvio,
    enviando,
    criado,
    alterar,
    escolherMotivo,
    escolherSolicitante,
    enviar,
    adicionarArquivos: (novos: File[]) => setArquivos((lista) => [...lista, ...novos.map((arquivo) => ({ id: gerarId(), arquivo, situacao: "pendente" as const }))]),
    removerArquivo: (id: string) => setArquivos((lista) => lista.filter((atual) => atual.id !== id)),
    reenviarAnexosQueFalharam: () => { if (criado) void enviarAnexos(criado.id, arquivos.filter((item) => item.situacao === "falhou")); },
    descartarRascunho: () => descartar(rascunhoVazio(nomeInicial)),
    comecarOutro: () => { setCriado(null); setArquivos([]); },
  };
}
