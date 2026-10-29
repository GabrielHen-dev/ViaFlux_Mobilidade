"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import CartaoDeAcesso, { ErroDeAcesso, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass, linkDeAcessoClass } from "@/components/auth/CartaoDeAcesso";

export default function LoginForm() {
  const { estado, entrar } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (estado.status === "autenticado") router.replace("/");
  }, [estado.status, router]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : "Não foi possível acessar a conta. Tente novamente.");
      setEnviando(false);
    }
  }

  const bloqueado = enviando || estado.status !== "anonimo";

  return (
    <CartaoDeAcesso
      titulo="Acessar conta"
      subtitulo="Central de Chamados ViaFlux"
      rodape={<>Não tem uma conta? <Link href="/cadastro" className="font-semibold text-brand-green underline-offset-2 hover:underline">Criar conta</Link></>}
    >
      <form onSubmit={enviar}>
        <div className="mb-4">
          <label htmlFor="login-email" className={labelDeAcessoClass}>E-mail</label>
          <input id="login-email" className={campoDeAcessoClass} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mb-2">
          <label htmlFor="login-senha" className={labelDeAcessoClass}>Senha</label>
          <input id="login-senha" className={campoDeAcessoClass} type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <p className="mb-6 text-right text-xs">
          <Link href="/esqueci-a-senha" className={linkDeAcessoClass}>Esqueceu a senha?</Link>
        </p>

        <ErroDeAcesso mensagem={erro} />

        <button type="submit" disabled={bloqueado || !email.trim() || !senha} className={botaoDeAcessoClass}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </CartaoDeAcesso>
  );
}
