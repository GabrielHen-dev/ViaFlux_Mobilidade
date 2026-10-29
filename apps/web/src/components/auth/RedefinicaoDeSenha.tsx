"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { redefinirSenha } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import { useAuth } from "@/store/AuthContext";
import CartaoDeAcesso, {
  ErroDeAcesso, ErroDoCampo, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass, linkDeAcessoClass,
} from "@/components/auth/CartaoDeAcesso";

const SENHA_MINIMA = 8;

export default function RedefinicaoDeSenha({ token }: { token: string }) {
  const { estado, sair } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erroDoCampo, setErroDoCampo] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (senha.length < SENHA_MINIMA) return setErroDoCampo(`A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
    if (confirmacao !== senha) return setErroDoCampo("As senhas não conferem.");
    setErroDoCampo(undefined);
    setEnviando(true);
    try {
      const resposta = await redefinirSenha(token, senha);
      if (estado.status === "autenticado") sair();
      setConcluido(resposta.mensagem);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : "Não foi possível alterar a senha. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <CartaoDeAcesso titulo="Link inválido" subtitulo="O link de redefinição está incompleto ou expirou.">
        <Link href="/esqueci-a-senha" className={`${botaoDeAcessoClass} block text-center`}>Solicitar novo link</Link>
      </CartaoDeAcesso>
    );
  }

  if (concluido) {
    return (
      <CartaoDeAcesso titulo="Redefinição concluída" subtitulo={concluido}>
        <Link href="/login" className={`${botaoDeAcessoClass} block text-center`}>Entrar</Link>
      </CartaoDeAcesso>
    );
  }

  return (
    <CartaoDeAcesso
      titulo="Redefinir senha"
      subtitulo={`Mínimo de ${SENHA_MINIMA} caracteres.`}
      rodape={<Link href="/login" className="font-semibold text-brand-green underline-offset-2 hover:underline">Voltar ao login</Link>}
    >
      <form noValidate onSubmit={enviar}>
        <div className="mb-4">
          <label htmlFor="redefinicao-senha" className={labelDeAcessoClass}>Senha nova</label>
          <input id="redefinicao-senha" className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="redefinicao-confirmacao" className={labelDeAcessoClass}>Confirme a senha nova</label>
          <input id="redefinicao-confirmacao" className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72}
            aria-invalid={erroDoCampo ? true : undefined} aria-describedby={erroDoCampo ? "redefinicao-erro" : undefined}
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <ErroDoCampo id="redefinicao-erro" mensagem={erroDoCampo} />
        </div>
        <ErroDeAcesso mensagem={erro} />
        {erro && (
          <p className="mb-4 text-xs text-slate-500">
            <Link href="/esqueci-a-senha" className={linkDeAcessoClass}>Solicitar novo link</Link>
          </p>
        )}
        <button type="submit" disabled={enviando || !senha || !confirmacao} className={botaoDeAcessoClass}>
          {enviando ? "Salvando…" : "Salvar senha nova"}
        </button>
      </form>
    </CartaoDeAcesso>
  );
}
