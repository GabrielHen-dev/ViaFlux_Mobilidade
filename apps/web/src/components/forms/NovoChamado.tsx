"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, CircleAlert } from "lucide-react";
import { useUsuarioAutenticado } from "@/store/AuthContext";
import type { UsuarioAutenticado } from "@/types/auth";
import { PERFIS_DE_CLIENTE, PERFIS_QUE_ABREM_PELA_CENTRAL, usuarioTemPerfil } from "@/utils/perfis";
import { ID_DO_CAMPO, ROTULO_DO_CAMPO, type CampoDoFormulario } from "@/components/forms/novo-chamado/formulario";
import { useAberturaDeChamado } from "@/components/forms/novo-chamado/useAberturaDeChamado";
import { SecaoDeAnexos, SecaoDoProblema, SecaoDoSolicitante, SecaoDoVeiculoELocal } from "@/components/forms/novo-chamado/SecoesDoFormulario";
import ConfirmacaoDeAbertura from "@/components/forms/novo-chamado/ConfirmacaoDeAbertura";

function FormularioDoChamado({ usuario }: { usuario: UsuarioAutenticado }) {
  const ehCliente = usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE);
  const abrePelaCentral = !ehCliente && usuarioTemPerfil(usuario, PERFIS_QUE_ABREM_PELA_CENTRAL);
  const gestorFrota = usuarioTemPerfil(usuario, ["GESTOR_FROTA"]);
  const resumoDosErros = useRef<HTMLDivElement>(null);
  const avisoDeFalha = useRef<HTMLDivElement>(null);
  const abertura = useAberturaDeChamado({ abrePelaCentral, nomeInicial: abrePelaCentral ? "" : usuario.nome, resumoDosErros, avisoDeFalha });
  const { campos, erros, alterar } = abertura;

  if (abertura.criado) {
    return (
      <ConfirmacaoDeAbertura
        chamado={abertura.criado}
        arquivos={abertura.arquivos}
        ehCliente={ehCliente}
        aoReenviarAnexos={abertura.reenviarAnexosQueFalharam}
        aoNovoChamado={abertura.comecarOutro}
      />
    );
  }

  const listaDeErros = Object.entries(erros).filter(([, mensagem]) => mensagem) as [CampoDoFormulario, string][];

  return (
    <main id="conteudo" className="p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href={ehCliente ? "/portal" : "/"} aria-label="Voltar" className="alvo-toque flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-all hover:border-[#CBD5E1] hover:bg-white">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Novo Chamado</h1>
            <p className="text-sm text-[#64748B]">O protocolo é gerado quando o servidor confirmar a abertura.</p>
          </div>
        </div>

        {abertura.restaurado && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span>Recuperamos o rascunho que você estava preenchendo. Anexos precisam ser selecionados de novo.</span>
            <button type="button" onClick={abertura.descartarRascunho} className="text-xs font-semibold underline">Descartar rascunho</button>
          </div>
        )}

        {abertura.falhaDoEnvio && (
          <div ref={avisoDeFalha} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="flex items-center gap-2 font-semibold"><CircleAlert size={16} aria-hidden /> Envio não confirmado: a abertura não foi registrada.</p>
            <p className="mt-1">{abertura.falhaDoEnvio} Seus dados continuam preenchidos. Use “Tentar de novo”, sem risco de duplicar o chamado.</p>
          </div>
        )}

        {listaDeErros.length > 0 && (
          <div ref={resumoDosErros} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none">
            <p className="font-semibold">Corrija os campos antes de enviar:</p>
            <ul className="mt-1 list-disc pl-5">
              {listaDeErros.map(([campo, mensagem]) => (
                <li key={campo}><a href={`#${ID_DO_CAMPO[campo]}`} className="underline">{ROTULO_DO_CAMPO[campo]}</a>: {mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        <form noValidate onSubmit={abertura.enviar} className="space-y-5">
          <SecaoDoProblema campos={campos} erros={erros} alterar={alterar} escolherMotivo={abertura.escolherMotivo} />
          <SecaoDoSolicitante campos={campos} erros={erros} alterar={alterar} abrePelaCentral={abrePelaCentral} gestorFrota={gestorFrota} escolherSolicitante={abertura.escolherSolicitante} />
          <SecaoDoVeiculoELocal campos={campos} erros={erros} alterar={alterar} />
          <SecaoDeAnexos arquivos={abertura.arquivos} aoAdicionar={abertura.adicionarArquivos} aoRemover={abertura.removerArquivo} />

          <button type="submit" disabled={abertura.enviando} className="alvo-toque w-full rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-60">
            {abertura.enviando ? "Enviando…" : abertura.falhaDoEnvio ? "Tentar de novo" : "Abrir Chamado"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NovoChamado() {
  const usuario = useUsuarioAutenticado();
  return <FormularioDoChamado key={usuario.id} usuario={usuario} />;
}
