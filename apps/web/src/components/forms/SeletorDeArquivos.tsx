"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const videoDaCamera = useRef<HTMLVideoElement>(null);
  const transmissaoDaCamera = useRef<MediaStream | null>(null);
  const sessaoDaCamera = useRef(0);
  const idDaDica = useId();
  const [rejeicoes, setRejeicoes] = useState<string[]>([]);
  const [erroDaCamera, setErroDaCamera] = useState("");
  const [abrindoCamera, setAbrindoCamera] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [cameraPronta, setCameraPronta] = useState(false);

  function selecionar(arquivos: File[]) {
    const avaliados = arquivos.map((arquivo) => ({ arquivo, rejeicao: motivoDeRejeicao(arquivo) }));
    setRejeicoes(avaliados.flatMap(({ rejeicao }) => (rejeicao ? [rejeicao.mensagem] : [])));
    const aceitos = avaliados.filter(({ rejeicao }) => !rejeicao).map(({ arquivo }) => arquivo);
    if (aceitos.length > 0) aoAceitar(aceitos);
  }

  function encerrarTransmissao() {
    transmissaoDaCamera.current?.getTracks().forEach((faixa) => faixa.stop());
    transmissaoDaCamera.current = null;
  }

  function fecharCamera() {
    sessaoDaCamera.current += 1;
    encerrarTransmissao();
    setCameraAberta(false);
    setCameraPronta(false);
    setAbrindoCamera(false);
  }

  useEffect(() => () => {
    sessaoDaCamera.current += 1;
    encerrarTransmissao();
  }, []);

  useEffect(() => {
    if (cameraAberta && videoDaCamera.current && transmissaoDaCamera.current) {
      videoDaCamera.current.srcObject = transmissaoDaCamera.current;
    }
  }, [cameraAberta]);

  async function abrirCamera() {
    setErroDaCamera("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErroDaCamera("Câmera indisponível neste navegador. Anexe um arquivo.");
      return;
    }
    const sessao = ++sessaoDaCamera.current;
    setAbrindoCamera(true);
    try {
      const transmissao = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (sessao !== sessaoDaCamera.current) {
        transmissao.getTracks().forEach((faixa) => faixa.stop());
        return;
      }
      transmissaoDaCamera.current = transmissao;
      setCameraAberta(true);
    } catch (erro) {
      if (sessao !== sessaoDaCamera.current) return;
      const nome = erro instanceof DOMException ? erro.name : "";
      setErroDaCamera(nome === "NotAllowedError" || nome === "SecurityError"
        ? "Permissão da câmera negada. Autorize o acesso no navegador ou anexe um arquivo."
        : nome === "NotFoundError"
          ? "Nenhuma câmera encontrada. Anexe um arquivo."
          : "Não foi possível acessar a câmera. Anexe um arquivo.");
    } finally {
      if (sessao === sessaoDaCamera.current) setAbrindoCamera(false);
    }
  }

  function fotografar() {
    const video = videoDaCamera.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const tela = document.createElement("canvas");
    tela.width = video.videoWidth;
    tela.height = video.videoHeight;
    const contexto = tela.getContext("2d");
    if (!contexto) {
      setErroDaCamera("Não foi possível capturar a foto. Tente novamente.");
      return;
    }
    contexto.drawImage(video, 0, 0, tela.width, tela.height);
    tela.toBlob((imagem) => {
      if (!imagem) {
        setErroDaCamera("Não foi possível capturar a foto. Tente novamente.");
        return;
      }
      selecionar([new File([imagem], `foto-${Date.now()}.jpg`, { type: "image/jpeg" })]);
      fecharCamera();
    }, "image/jpeg", 0.85);
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
        onChange={(evento) => { selecionar(Array.from(evento.target.files ?? [])); evento.target.value = ""; }}
      />
      {compacto ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={desabilitado} onClick={() => entradaDeArquivos.current?.click()} className={botaoSecundario}>
            <Paperclip size={14} aria-hidden /> Anexar arquivo
          </button>
          <button type="button" disabled={desabilitado || abrindoCamera || cameraAberta} onClick={() => void abrirCamera()} className={botaoSecundario}>
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
            onDrop={(evento) => { evento.preventDefault(); selecionar(Array.from(evento.dataTransfer.files)); }}
            className={cn("w-full rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-brand-blue", desabilitado && "opacity-40")}
          >
            <Upload className="mx-auto mb-2 text-slate-400" size={26} strokeWidth={1.5} aria-hidden />
            <span className="block text-sm text-slate-500">Arraste arquivos ou <span className="font-semibold text-brand-blue">clique para anexar</span></span>
          </button>
          <button type="button" disabled={desabilitado || abrindoCamera || cameraAberta} onClick={() => void abrirCamera()} className={cn(botaoSecundario, "w-full")}>
            <Camera size={14} aria-hidden /> {abrindoCamera ? "Abrindo câmera…" : "Tirar foto com a câmera"}
          </button>
        </div>
      )}
      {cameraAberta && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-2">
          <video ref={videoDaCamera} aria-label="Prévia da câmera" autoPlay muted playsInline onLoadedMetadata={() => setCameraPronta(true)} className="aspect-video w-full rounded-lg object-contain" />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={fecharCamera} className={botaoSecundario}>Cancelar</button>
            <button type="button" disabled={!cameraPronta || desabilitado} onClick={fotografar} className="alvo-toque rounded-xl bg-brand-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Fotografar</button>
          </div>
        </div>
      )}
      {erroDaCamera && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{erroDaCamera}</p>}
      <p id={idDaDica} className="mt-2 text-xs text-slate-400">Opcional · PNG, JPG ou PDF · até {LIMITE_ANEXO_MB} MB por arquivo.</p>
      {rejeicoes.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-xs font-medium text-red-600">
          {rejeicoes.map((mensagem) => <li key={mensagem}>{mensagem}</li>)}
        </ul>
      )}
    </div>
  );
}
