"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { confirmarEmail, reenviarVerificacao } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import { useAuth } from "@/store/AuthContext";
import CartaoDeAcesso, {
  ErroDeAcesso, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass,
} from "@/components/auth/CartaoDeAcesso";

type Situacao = { etapa: "confirmando" } | { etapa: "confirmado"; mensagem: string } | { etapa: "reenvio"; erro: string | null };

function mensagemDaFalha(falha: unknown, padrao: string) {
  return falha instanceof ErroApi ? falha.message : padrao;
}

export function ReenvioDaVerificacao({ emailInicial = "" }: { emailInicial?: string }) {
  const [email, setEmail] = useState(emailInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await reenviarVerificacao(email.trim());
      toast.success("Solicitação enviada", { description: resposta.mensagem });
    } catch (falha) {
      setErro(mensagemDaFalha(falha, "Não foi possível reenviar o link. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      <div className="mb-4">
        <label htmlFor="reenvio-email" className={labelDeAcessoClass}>E-mail da conta</label>
        <input id="reenvio-email" className={campoDeAcessoClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <ErroDeAcesso mensagem={erro} />
      <button type="submit" disabled={enviando || !email.trim()} className={botaoDeAcessoClass}>
        {enviando ? "Enviando…" : "Reenviar link de confirmação"}
      </button>
    </form>
  );
}

export default function VerificacaoDeEmail({ token }: { token: string }) {
  const { estado, atualizarUsuario } = useAuth();
  const [situacao, setSituacao] = useState<Situacao>(token ? { etapa: "confirmando" } : { etapa: "reenvio", erro: null });
  const tokenJaUsado = useRef<string | null>(null);

  useEffect(() => {
    if (!token || tokenJaUsado.current === token) return;
    tokenJaUsado.current = token;
    confirmarEmail(token)
      .then((resposta) => setSituacao({ etapa: "confirmado", mensagem: resposta.mensagem }))
      .catch((falha: unknown) => setSituacao({ etapa: "reenvio", erro: mensagemDaFalha(falha, "Não foi possível confirmar o e-mail.") }));
  }, [token]);

  useEffect(() => {
    if (situacao.etapa === "confirmado" && estado.status === "autenticado") void atualizarUsuario();
  }, [situacao.etapa, estado.status, atualizarUsuario]);

  if (situacao.etapa === "confirmando") {
    return (
      <CartaoDeAcesso titulo="Confirmação de e-mail">
        <p role="status" className="text-sm text-slate-500">Validando link…</p>
      </CartaoDeAcesso>
    );
  }

  if (situacao.etapa === "confirmado") {
    return (
      <CartaoDeAcesso titulo="Verificação concluída" subtitulo={situacao.mensagem}>
        <Link href={estado.status === "autenticado" ? "/" : "/login"} className={`${botaoDeAcessoClass} block text-center`}>
          {estado.status === "autenticado" ? "Ir para o início" : "Entrar"}
        </Link>
      </CartaoDeAcesso>
    );
  }

  return (
    <CartaoDeAcesso
      titulo="Confirmar e-mail"
      subtitulo="Informe o e-mail cadastrado para receber um novo link."
      rodape={<Link href="/login" className="font-semibold text-brand-green underline-offset-2 hover:underline">Voltar ao login</Link>}
    >
      <ErroDeAcesso mensagem={situacao.erro} />
      <ReenvioDaVerificacao emailInicial={estado.status === "autenticado" ? estado.usuario.email : ""} />
    </CartaoDeAcesso>
  );
}
