"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import type { EnderecoEncontrado, Localizacao } from "@/types/chamado";
import { useApi } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import { buscarEnderecos, buscarPorCep, buscarPorCoordenadas } from "@/services/api/enderecos";
import {
  UFS, comEnderecoFormatado, completarLocalizacao, descreverCoordenadas, formatarCep, preencherComCep,
  preencherComEnderecoEncontrado, temCoordenadas,
} from "@/utils/endereco";
import { cn } from "@/utils/cn";

export { descreverCoordenadas };

const TEMPO_LIMITE_GPS_MS = 15_000;
const ESPERA_DA_BUSCA_MS = 500;
const MINIMO_DE_CARACTERES_DA_BUSCA = 3;

const MENSAGEM_DO_ERRO_DE_GPS: Record<number, string> = {
  1: "Permissão de localização negada. Informe o endereço manualmente.",
  2: "Não foi possível obter a posição do aparelho. Informe o endereço manualmente.",
  3: "O GPS demorou para responder. Tente de novo ou informe o endereço.",
};

const CAMPOS_ESTRUTURADOS = ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"] as const;

const rotuloClass = "mb-1 block text-xs font-medium text-slate-600";

type Aviso = { tipo: "sucesso" | "alerta"; texto: string };
type EtapaDoGps = "parado" | "localizando" | "identificando";

interface Props {
  id: string;
  valor: Localizacao;
  aoAlterar: (localizacao: Localizacao) => void;
  inputClassName: string;
  erro?: string;
}

function normalizar(valor: Localizacao) {
  const localizacao = completarLocalizacao(valor);
  const enderecoLivre = localizacao.endereco.trim();
  const semCamposEstruturados = CAMPOS_ESTRUTURADOS.every((campo) => !localizacao[campo].trim());
  const soCoordenadas = temCoordenadas(localizacao)
    && enderecoLivre === descreverCoordenadas(localizacao.latitude, localizacao.longitude);
  if (!semCamposEstruturados || !enderecoLivre || soCoordenadas) return localizacao;
  return { ...localizacao, logradouro: enderecoLivre };
}

function MensagemDeAviso({ aviso, className }: { aviso: Aviso; className?: string }) {
  const alerta = aviso.tipo === "alerta";
  return (
    <p role={alerta ? "alert" : "status"} className={cn("text-xs font-medium", alerta ? "text-amber-700" : "text-emerald-700", className)}>
      {aviso.texto}
    </p>
  );
}

export default function CampoDeLocalizacao({ id, valor, aoAlterar, inputClassName, erro }: Props) {
  const api = useApi();
  const localizacao = normalizar(valor);
  const ultimaLocalizacao = useRef(localizacao);

  const [etapaDoGps, setEtapaDoGps] = useState<EtapaDoGps>("parado");
  const [avisoDoGps, setAvisoDoGps] = useState<Aviso | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoDoCep, setAvisoDoCep] = useState<Aviso | null>(null);
  const [sugestoes, setSugestoes] = useState<EnderecoEncontrado[]>([]);
  const [listaAberta, setListaAberta] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [avisoDaBusca, setAvisoDaBusca] = useState("");

  const temporizadorDaBusca = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const consultaDaBusca = useRef(0);
  const consultaDoCep = useRef(0);

  useEffect(() => {
    ultimaLocalizacao.current = normalizar(valor);
  }, [valor]);

  useEffect(() => {
    const temporizador = temporizadorDaBusca;
    return () => clearTimeout(temporizador.current);
  }, []);

  const listaVisivel = listaAberta && sugestoes.length > 0;
  const idDaLista = `${id}-sugestoes`;
  const idDaOpcao = (indice: number) => `${id}-sugestao-${indice}`;
  const descricaoDaRua = [`${id}-dica-rua`, erro ? `${id}-erro` : null].filter(Boolean).join(" ");

  function emitir(nova: Localizacao) {
    const completa = comEnderecoFormatado(nova);
    ultimaLocalizacao.current = completa;
    aoAlterar(completa);
  }

  function alterarCampo(parcial: Partial<Localizacao>) {
    emitir({ ...ultimaLocalizacao.current, ...parcial });
  }

  function fecharSugestoes() {
    clearTimeout(temporizadorDaBusca.current);
    consultaDaBusca.current += 1;
    setSugestoes([]);
    setListaAberta(false);
    setIndiceAtivo(-1);
    setBuscandoSugestoes(false);
  }

  function usarGps() {
    if (!("geolocation" in navigator)) {
      setAvisoDoGps({ tipo: "alerta", texto: "Este navegador não oferece localização. Informe o endereço manualmente." });
      return;
    }
    setEtapaDoGps("localizando");
    setAvisoDoGps(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { void identificarPosicao(coords.latitude, coords.longitude); },
      (falha) => {
        setEtapaDoGps("parado");
        setAvisoDoGps({ tipo: "alerta", texto: MENSAGEM_DO_ERRO_DE_GPS[falha.code] ?? MENSAGEM_DO_ERRO_DE_GPS[2] });
      },
      { enableHighAccuracy: true, timeout: TEMPO_LIMITE_GPS_MS },
    );
  }

  async function identificarPosicao(latitude: number, longitude: number) {
    alterarCampo({ latitude, longitude });
    setEtapaDoGps("identificando");
    try {
      const encontrado = await buscarPorCoordenadas(api, latitude, longitude);
      emitir(preencherComEnderecoEncontrado(ultimaLocalizacao.current, { ...encontrado, latitude, longitude }));
      fecharSugestoes();
      setAvisoDoCep(null);
      setAvisoDaBusca("");
      setAvisoDoGps({ tipo: "sucesso", texto: "Localização obtida com sucesso." });
    } catch {
      setAvisoDoGps({
        tipo: "alerta",
        texto: "Registramos sua posição pelo GPS, mas não conseguimos identificar a rua. Preencha o endereço abaixo.",
      });
    } finally {
      setEtapaDoGps("parado");
    }
  }

  function digitarCep(texto: string) {
    const cep = formatarCep(texto);
    alterarCampo({ cep });
    const consulta = ++consultaDoCep.current;
    setAvisoDoCep(null);
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) {
      setBuscandoCep(false);
      return;
    }
    void consultarCep(digitos, consulta);
  }

  async function consultarCep(digitos: string, consulta: number) {
    setBuscandoCep(true);
    try {
      const encontrado = await buscarPorCep(api, digitos);
      if (consulta !== consultaDoCep.current) return;
      emitir(preencherComCep(ultimaLocalizacao.current, encontrado));
      setAvisoDoCep({ tipo: "sucesso", texto: "Endereço do CEP preenchido. Confira a rua e informe o número." });
    } catch (falha) {
      if (consulta !== consultaDoCep.current) return;
      setAvisoDoCep({
        tipo: "alerta",
        texto: falha instanceof ErroApi && falha.status === 404
          ? "CEP não encontrado. Confira os números ou digite o nome da rua."
          : "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      });
    } finally {
      if (consulta === consultaDoCep.current) setBuscandoCep(false);
    }
  }

  function digitarRua(texto: string) {
    alterarCampo({ logradouro: texto });
    agendarBusca(texto);
  }

  function agendarBusca(texto: string) {
    clearTimeout(temporizadorDaBusca.current);
    const consulta = ++consultaDaBusca.current;
    const termo = texto.trim();
    setAvisoDaBusca("");
    if (termo.length < MINIMO_DE_CARACTERES_DA_BUSCA) {
      setSugestoes([]);
      setListaAberta(false);
      setIndiceAtivo(-1);
      setBuscandoSugestoes(false);
      return;
    }
    temporizadorDaBusca.current = setTimeout(() => { void buscarSugestoes(termo, consulta); }, ESPERA_DA_BUSCA_MS);
  }

  async function buscarSugestoes(termo: string, consulta: number) {
    setBuscandoSugestoes(true);
    const atual = ultimaLocalizacao.current;
    const proximidade = temCoordenadas(atual) ? { latitude: atual.latitude, longitude: atual.longitude } : null;
    try {
      const encontrados = await buscarEnderecos(api, termo, proximidade);
      if (consulta !== consultaDaBusca.current) return;
      setSugestoes(encontrados);
      setIndiceAtivo(-1);
      setListaAberta(true);
      setAvisoDaBusca(encontrados.length ? "" : "Nenhum endereço encontrado com esse nome. Confira a digitação ou preencha os campos manualmente.");
    } catch {
      if (consulta !== consultaDaBusca.current) return;
      setSugestoes([]);
      setListaAberta(false);
      setAvisoDaBusca("Não foi possível buscar sugestões agora. Preencha o endereço manualmente.");
    } finally {
      if (consulta === consultaDaBusca.current) setBuscandoSugestoes(false);
    }
  }

  function escolherSugestao(sugestao: EnderecoEncontrado) {
    emitir(preencherComEnderecoEncontrado(ultimaLocalizacao.current, sugestao));
    fecharSugestoes();
    setAvisoDaBusca("");
    setAvisoDoCep(null);
  }

  function navegarNasSugestoes(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      if (!sugestoes.length) return;
      evento.preventDefault();
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      setListaAberta(true);
      setIndiceAtivo((indice) => {
        if (indice < 0) return passo === 1 ? 0 : sugestoes.length - 1;
        return (indice + passo + sugestoes.length) % sugestoes.length;
      });
      return;
    }
    if (evento.key === "Enter" && listaVisivel) {
      evento.preventDefault();
      if (indiceAtivo >= 0) escolherSugestao(sugestoes[indiceAtivo]);
      else setListaAberta(false);
      return;
    }
    if (evento.key === "Escape" && listaVisivel) {
      evento.preventDefault();
      setListaAberta(false);
      setIndiceAtivo(-1);
    }
  }

  const textoDoBotaoDeGps = {
    parado: "Usar minha localização",
    localizando: "Localizando…",
    identificando: "Identificando o endereço…",
  }[etapaDoGps];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <button
          type="button"
          onClick={usarGps}
          disabled={etapaDoGps !== "parado"}
          className="alvo-toque inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {etapaDoGps === "parado"
            ? <LocateFixed size={16} aria-hidden />
            : <LoaderCircle size={16} className="animate-spin" aria-hidden />}
          {textoDoBotaoDeGps}
        </button>
        {avisoDoGps && <MensagemDeAviso aviso={avisoDoGps} />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-cep`} className={rotuloClass}>CEP</label>
          <div className="relative">
            <input
              id={`${id}-cep`}
              className={inputClassName}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
              placeholder="00000-000"
              value={formatarCep(localizacao.cep)}
              aria-describedby={`${id}-dica-cep`}
              onChange={(evento) => digitarCep(evento.target.value)}
            />
            {buscandoCep && (
              <LoaderCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" aria-label="Buscando CEP" />
            )}
          </div>
        </div>
        <p id={`${id}-dica-cep`} className="text-xs text-slate-500 sm:col-span-4 sm:self-end sm:pb-3">
          Não sabe o CEP? Use sua localização ou digite o nome da rua.
        </p>
        {avisoDoCep && <MensagemDeAviso aviso={avisoDoCep} className="sm:col-span-6" />}

        <div className="relative sm:col-span-4">
          <label htmlFor={id} className={rotuloClass}>Rua, avenida ou rodovia</label>
          <div className="relative">
            <input
              id={id}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listaVisivel}
              aria-controls={idDaLista}
              aria-activedescendant={listaVisivel && indiceAtivo >= 0 ? idDaOpcao(indiceAtivo) : undefined}
              aria-invalid={erro ? true : undefined}
              aria-describedby={descricaoDaRua}
              autoComplete="off"
              className={inputClassName}
              placeholder="Ex: Rodovia Presidente Dutra"
              value={localizacao.logradouro}
              onChange={(evento) => digitarRua(evento.target.value)}
              onKeyDown={navegarNasSugestoes}
              onBlur={() => setListaAberta(false)}
              onFocus={() => { if (sugestoes.length) setListaAberta(true); }}
            />
            {buscandoSugestoes && (
              <LoaderCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" aria-label="Buscando sugestões" />
            )}
          </div>
          <ul
            id={idDaLista}
            role="listbox"
            aria-label="Sugestões de endereço"
            hidden={!listaVisivel}
            onMouseDown={(evento) => evento.preventDefault()}
            className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {sugestoes.map((sugestao, indice) => (
              <li
                key={`${sugestao.descricao}-${indice}`}
                id={idDaOpcao(indice)}
                role="option"
                aria-selected={indice === indiceAtivo}
                onClick={() => escolherSugestao(sugestao)}
                onMouseEnter={() => setIndiceAtivo(indice)}
                className={cn(
                  "alvo-toque flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm text-brand-dark",
                  indice === indiceAtivo && "bg-blue-50",
                )}
              >
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-slate-400" aria-hidden />
                <span className="break-words">{sugestao.descricao}</span>
              </li>
            ))}
          </ul>
          <p id={`${id}-dica-rua`} className="mt-1 text-xs text-slate-500">Digite pelo menos 3 letras para ver sugestões.</p>
          <p className="sr-only" aria-live="polite">
            {listaVisivel ? `${sugestoes.length} ${sugestoes.length === 1 ? "sugestão" : "sugestões"} de endereço. Use as setas para escolher.` : ""}
          </p>
          {avisoDaBusca && <p role="status" className="mt-1 text-xs font-medium text-amber-700">{avisoDaBusca}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${id}-numero`} className={rotuloClass}>Número</label>
          <input
            id={`${id}-numero`}
            className={inputClassName}
            autoComplete="off"
            placeholder="Ex: 1500 ou km 312"
            value={localizacao.numero}
            onChange={(evento) => alterarCampo({ numero: evento.target.value })}
          />
        </div>

        <div className="sm:col-span-6">
          <label htmlFor={`${id}-complemento`} className={rotuloClass}>Complemento / ponto de referência</label>
          <input
            id={`${id}-complemento`}
            className={inputClassName}
            autoComplete="off"
            placeholder="Ex: acostamento sentido São Paulo, em frente ao posto"
            value={localizacao.complemento}
            onChange={(evento) => alterarCampo({ complemento: evento.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${id}-bairro`} className={rotuloClass}>Bairro</label>
          <input
            id={`${id}-bairro`}
            className={inputClassName}
            autoComplete="off"
            value={localizacao.bairro}
            onChange={(evento) => alterarCampo({ bairro: evento.target.value })}
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor={`${id}-cidade`} className={rotuloClass}>Cidade</label>
          <input
            id={`${id}-cidade`}
            className={inputClassName}
            autoComplete="address-level2"
            value={localizacao.cidade}
            onChange={(evento) => alterarCampo({ cidade: evento.target.value })}
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor={`${id}-uf`} className={rotuloClass}>UF</label>
          <select
            id={`${id}-uf`}
            className={inputClassName}
            autoComplete="address-level1"
            value={localizacao.uf}
            onChange={(evento) => alterarCampo({ uf: evento.target.value })}
          >
            <option value="">—</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
      </div>

      {erro && <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-red-600">{erro}</p>}
    </div>
  );
}
