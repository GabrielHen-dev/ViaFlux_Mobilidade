"use client";

import { useId, useRef, useState } from "react";
import { Camera, Paperclip, Upload } from "lucide-react";
import { LIMITE_ANEXO_MB, TIPOS_DE_ANEXO_PERMITIDOS, motivoDeRejeicao } from "@/utils/anexos";
import { cn } from "@/utils/cn";

interface Props {
  aoAceitar: (arquivos: File[]) => void;
  compacto?: boolean;
  desabilitado?: boolean;
}

export default function SeletorDeArquivos({ aoAceitar, compacto = false, desabilitado = false }: Props) {
  const entradaDeArquivos = useRef<HTMLInputElement>(null);
  const entradaDaCamera = useRef<HTMLInputElement>(null);
  const idDaDica = useId();
  const [rejeicoes, setRejeicoes] = useState<string[]>([]);

  function selecionar(lista: FileList | null) {
    const arquivos = Array.from(lista ?? []);
    const avaliados = arquivos.map((arquivo) => ({ arquivo, rejeicao: motivoDeRejeicao(arquivo) }));
    setRejeicoes(avaliados.flatMap(({ rejeicao }) => (rejeicao ? [rejeicao.mensagem] : [])));
    const aceitos = avaliados.filter(({ rejeicao }) => !rejeicao).map(({ arquivo }) => arquivo);
    if (aceitos.length > 0) aoAceitar(aceitos);
  }

  const botaoSecundario = "alvo-toque inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-blue hover:text-brand-blue disabled:opacity-40";

  return (
    <div>
      <input
        ref={entradaDeArquivos}
        aria-label="Selecionar anexos"
        aria-describedby={idDaDica}
        type="file"
        multiple
        accept={TIPOS_DE_ANEXO_PERMITIDOS.join(",")}
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => { selecionar(evento.target.files); evento.target.value = ""; }}
      />
      <input
        ref={entradaDaCamera}
        aria-label="Tirar foto com a câmera"
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => { selecionar(evento.target.files); evento.target.value = ""; }}
      />
      {compacto ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={desabilitado} onClick={() => entradaDeArquivos.current?.click()} className={botaoSecundario}>
            <Paperclip size={14} aria-hidden /> Anexar arquivo
          </button>
          <button type="button" disabled={desabilitado} onClick={() => entradaDaCamera.current?.click()} className={botaoSecundario}>
            <Camera size={14} aria-hidden /> Tirar foto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => entradaDeArquivos.current?.click()}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={(evento) => { evento.preventDefault(); selecionar(evento.dataTransfer.files); }}
            className={cn("w-full rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-brand-blue", desabilitado && "opacity-40")}
          >
            <Upload className="mx-auto mb-2 text-slate-400" size={26} strokeWidth={1.5} aria-hidden />
            <span className="block text-sm text-slate-500">Arraste arquivos ou <span className="font-semibold text-brand-blue">clique para selecionar</span></span>
          </button>
          <button type="button" disabled={desabilitado} onClick={() => entradaDaCamera.current?.click()} className={cn(botaoSecundario, "w-full")}>
            <Camera size={14} aria-hidden /> Tirar foto com a câmera
          </button>
        </div>
      )}
      <p id={idDaDica} className="mt-2 text-xs text-slate-400">Fotos PNG ou JPG e documentos PDF · até {LIMITE_ANEXO_MB} MB por arquivo. Se a câmera não abrir ou a permissão for negada, use “Anexar arquivo” para escolher uma foto do dispositivo; anexar imagem é opcional.</p>
      {rejeicoes.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-xs font-medium text-red-600">
          {rejeicoes.map((mensagem) => <li key={mensagem}>{mensagem}</li>)}
        </ul>
      )}
    </div>
  );
}
