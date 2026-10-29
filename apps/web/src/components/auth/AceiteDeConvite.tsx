"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { aceitarConvite, consultarConvite, type Convite } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import { useAuth } from "@/store/AuthContext";
import CartaoDeAcesso, {
  AvisoDeAcesso, ErroDeAcesso, ErroDoCampo, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass, linkDeAcessoClass,
} from "@/components/auth/CartaoDeAcesso";

const SENHA_MINIMA = 8;

type Consulta =
  | { etapa: "carregando" }
  | { etapa: "valido"; convite: Convite }
  | { etapa: "invalido"; mensagem: string };

function mensagemDaFalha(falha: unknown, padrao: string) {
  return falha instanceof ErroApi ? falha.message : padrao;
}

function DadosDoConvite({ convite }: { convite: Convite }) {
  return (
    <dl className="mb-5 space-y-3 rounded-xl border border-[#E2E8F0] bg-slate-50 px-4 py-3.5 text-sm">
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nome</dt>
        <dd className="font-semibold text-brand-dark">{convite.nome}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">E-mail de acesso</dt>
        <dd className="break-all font-semibold text-brand-dark">{convite.email}</dd>
      </div>
      {convite.perfis.length > 0 && (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{convite.perfis.length === 1 ? "Perfil" : "Perfis"}</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {convite.perfis.map((perfil) => (
              <span key={perfil.codigo} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">{perfil.descricao}</span>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}

export default function AceiteDeConvite({ token }: { token: string }) {
  const { estado, sair } = useAuth();
  const [consulta, setConsulta] = useState<Consulta>({ etapa: "carregando" });
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erroDoCampo, setErroDoCampo] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    consultarConvite(token)
      .then((convite) => { if (ativo) setConsulta({ etapa: "valido", convite }); })
      .catch((falha: unknown) => {
        if (ativo) setConsulta({ etapa: "invalido", mensagem: mensagemDaFalha(falha, "Não foi possível carregar o convite. Tente novamente.") });
      });
    return () => { ativo = false; };
  }, [token]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (senha.length < SENHA_MINIMA) return setErroDoCampo(`A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
    if (confirmacao !== senha) return setErroDoCampo("As senhas não conferem.");
    setErroDoCampo(undefined);
    setEnviando(true);
    try {
      const resposta = await aceitarConvite(token, senha);
      if (estado.status === "autenticado") sair();
      setConcluido(resposta.mensagem);
    } catch (falha) {
      setErro(mensagemDaFalha(falha, "Não foi possível ativar o acesso. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <CartaoDeAcesso titulo="Link incompleto" subtitulo="Abra o link exatamente como foi recebido no e-mail.">
        <Link href="/login" className={`${botaoDeAcessoClass} block text-center`}>Ir para o login</Link>
      </CartaoDeAcesso>
    );
  }

  if (concluido) {
    return (
      <CartaoDeAcesso titulo="Acesso ativado" subtitulo="Sua conta está pronta para uso.">
        <AvisoDeAcesso mensagem={concluido} />
        <Link href="/login" className={`${botaoDeAcessoClass} block text-center`}>Entrar</Link>
      </CartaoDeAcesso>
    );
  }

  if (consulta.etapa === "carregando") {
    return (
      <CartaoDeAcesso titulo="Convite de acesso" subtitulo="Validando o convite…">
        <p role="status" className="text-sm text-slate-500">Aguarde um instante.</p>
      </CartaoDeAcesso>
    );
  }

  if (consulta.etapa === "invalido") {
    return (
      <CartaoDeAcesso titulo="Convite indisponível" subtitulo="Solicite um novo convite ao administrador.">
        <ErroDeAcesso mensagem={consulta.mensagem} />
        <p className="text-sm text-slate-600">
          Já ativou seu acesso? <Link href="/login" className={linkDeAcessoClass}>Entrar</Link>
        </p>
      </CartaoDeAcesso>
    );
  }

  return (
    <CartaoDeAcesso
      titulo="Ative seu acesso"
      subtitulo="Crie uma senha com pelo menos 8 caracteres."
      rodape={<Link href="/login" className="font-semibold text-brand-green underline-offset-2 hover:underline">Ir para o login</Link>}
    >
      <DadosDoConvite convite={consulta.convite} />
      <form noValidate onSubmit={enviar}>
        <div className="mb-4">
          <label htmlFor="convite-senha" className={labelDeAcessoClass}>Senha</label>
          <input id="convite-senha" className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="convite-confirmacao" className={labelDeAcessoClass}>Confirme a senha</label>
          <input id="convite-confirmacao" className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72}
            aria-invalid={erroDoCampo ? true : undefined} aria-describedby={erroDoCampo ? "convite-erro" : undefined}
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <ErroDoCampo id="convite-erro" mensagem={erroDoCampo} />
        </div>
        <ErroDeAcesso mensagem={erro} />
        <button type="submit" disabled={enviando || !senha || !confirmacao} className={botaoDeAcessoClass}>
          {enviando ? "Ativando…" : "Ativar acesso"}
        </button>
      </form>
    </CartaoDeAcesso>
  );
}
