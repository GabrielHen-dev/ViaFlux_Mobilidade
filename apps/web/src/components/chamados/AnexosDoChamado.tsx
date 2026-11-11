"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Anexo, Chamado } from "@/types/chamado";
import { baixarAnexo, enviarAnexo } from "@/services/api/chamados";
import { useApi } from "@/store/AuthContext";
import { chaves, invalidarListas } from "@/hooks/consultas";
import SeletorDeArquivos from "@/components/forms/SeletorDeArquivos";
import { mensagemDeErro } from "@/components/feedback/EstadoDaConsulta";
import { ehImagem, formatarTamanho } from "@/utils/anexos";
import { formatarDataHora } from "@/utils/date";
import { gerarId } from "@/utils/id";

interface EnvioEmAndamento {
  id: string;
  arquivo: File;
  erro: string | null;
}

function useEnderecoDoArquivo(codigo: string, anexo: Anexo, habilitado: boolean) {
  const api = useApi();
  const consulta = useQuery({
    queryKey: ["anexo", codigo, anexo.id],
    queryFn: () => baixarAnexo(api, codigo, anexo.id),
    enabled: habilitado,
    staleTime: Infinity,
  });
  const [endereco, setEndereco] = useState<string | null>(null);
  useEffect(() => {
    if (!consulta.data) return;
    const url = URL.createObjectURL(consulta.data);
    queueMicrotask(() => setEndereco(url));
    return () => URL.revokeObjectURL(url);
  }, [consulta.data]);
  return { endereco, falhou: consulta.isError };
}

function MiniaturaDaImagem({ codigo, anexo }: { codigo: string; anexo: Anexo }) {
  const { endereco, falhou } = useEnderecoDoArquivo(codigo, anexo, true);
  if (falhou) return <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 p-2 text-center text-[10px] text-slate-400">Prévia indisponível</div>;
  if (!endereco) return <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />;
  return (
    <a href={endereco} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-slate-100" title={anexo.nome}>
      <Image src={endereco} alt={anexo.nome} width={160} height={160} unoptimized className="h-full w-full object-cover" />
    </a>
  );
}

export function BotaoDeDownload({ codigo, anexo }: { codigo: string; anexo: Anexo }) {
  const api = useApi();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const conteudo = await baixarAnexo(api, codigo, anexo.id);
      const url = URL.createObjectURL(conteudo);
      const link = document.createElement("a");
      link.href = url;
      link.download = anexo.nome;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (falha) {
      toast.error("Não foi possível baixar o arquivo", { description: mensagemDeErro(falha) });
    } finally {
      setBaixando(false);
    }
  }

  return (
    <button type="button" onClick={baixar} disabled={baixando} aria-label={`Baixar ${anexo.nome}`} className="alvo-toque inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-acao hover:bg-blue-50 disabled:opacity-50">
      <Download size={12} aria-hidden /> {baixando ? "Baixando…" : "Baixar"}
    </button>
  );
}

export default function AnexosDoChamado({ chamado, somenteLeitura = false }: { chamado: Chamado; somenteLeitura?: boolean }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const [envios, setEnvios] = useState<EnvioEmAndamento[]>([]);
  const [enviando, setEnviando] = useState(false);
  const imagens = chamado.anexos.filter((anexo) => ehImagem(anexo.tipoConteudo));

  async function enviar(lista: EnvioEmAndamento[]) {
    setEnviando(true);
    let enviados = 0;
    for (const envio of lista) {
      try {
        await enviarAnexo(api, chamado.id, envio.arquivo, envio.id);
        enviados += 1;
        setEnvios((atuais) => atuais.filter((atual) => atual.id !== envio.id));
      } catch (falha) {
        setEnvios((atuais) => atuais.map((atual) => (atual.id === envio.id ? { ...atual, erro: mensagemDeErro(falha) } : atual)));
      }
    }
    setEnviando(false);
    if (enviados > 0) toast.success(enviados === 1 ? "Anexo enviado" : `${enviados} anexos enviados`);
    await clienteDeConsultas.invalidateQueries({ queryKey: chaves.detalhe(chamado.id) });
    void invalidarListas(clienteDeConsultas);
  }

  function aoAceitar(arquivos: File[]) {
    const novos = arquivos.map((arquivo) => ({ id: gerarId(), arquivo, erro: null }));
    setEnvios((atuais) => [...atuais, ...novos]);
    void enviar(novos);
  }

  const falhas = envios.filter((envio) => envio.erro);

  return (
    <section className="vf-cartao" aria-labelledby={`anexos-${chamado.id}`}>
      <div className="flex items-center justify-between gap-2 border-b border-linha px-4 py-3">
        <h3 id={`anexos-${chamado.id}`} className="text-sm font-medium text-tinta">Anexos</h3>
        <span className="text-xs text-tinta-apagada">{chamado.anexos.length} arquivo{chamado.anexos.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="p-4">
      {imagens.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
          {imagens.map((anexo) => <MiniaturaDaImagem key={anexo.id} codigo={chamado.id} anexo={anexo} />)}
        </div>
      )}
      {chamado.anexos.length > 0 ? (
        <ul className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {chamado.anexos.map((anexo) => (
            <li key={anexo.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-linha bg-white px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                <FileText size={14} className="flex-shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block break-all font-medium">{anexo.nome}</span>
                  <span className="text-[10px] text-slate-400">{formatarTamanho(anexo.tamanho)} · {formatarDataHora(anexo.enviadoEm)} · {anexo.autor?.nome ?? "Sistema"}</span>
                </span>
              </span>
              <BotaoDeDownload codigo={chamado.id} anexo={anexo} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-slate-400">Nenhum anexo.</p>
      )}
      {envios.length > 0 && (
        <ul className="mb-3 space-y-1 text-xs" aria-live="polite">
          {envios.map((envio) => (
            <li key={envio.id} className={envio.erro ? "text-red-600" : "text-slate-500"}>
              {envio.arquivo.name}: {envio.erro ? `falha no envio. ${envio.erro}` : "enviando…"}
            </li>
          ))}
        </ul>
      )}
      {falhas.length > 0 && !enviando && (
        <button type="button" onClick={() => void enviar(falhas.map((falha) => ({ ...falha, erro: null })))} className="vf-botao-perigo alvo-toque mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2 text-xs font-semibold text-red-700">
          <RotateCcw size={12} aria-hidden /> Reenviar anexos
        </button>
      )}
      {!somenteLeitura && chamado.status !== "Fechado" && chamado.status !== "Cancelado" && <SeletorDeArquivos compacto aoAceitar={aoAceitar} desabilitado={enviando} />}
      </div>
    </section>
  );
}
