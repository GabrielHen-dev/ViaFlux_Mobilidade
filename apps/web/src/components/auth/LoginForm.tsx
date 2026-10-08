"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import MarcaViaFlux from "@/components/ui/MarcaViaFlux";

const labelClass = "block text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5";
const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-brand-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all";

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
      setErro(falha instanceof ErroApi ? falha.message : "Não foi possível entrar. Tente novamente.");
      setEnviando(false);
    }
  }

  const bloqueado = enviando || estado.status !== "anonimo";

  return (
    <main id="conteudo" className="flex min-h-screen items-center justify-center bg-brand-navy p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <MarcaViaFlux tamanho="lg" />
          <div>
            <div className="font-display text-lg font-bold leading-tight text-white">ViaFlux</div>
            <div className="text-sm leading-tight text-brand-green">Mobilidade</div>
          </div>
        </div>

        <form onSubmit={enviar} className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-xl font-bold text-brand-navy">Central de Chamados</h1>
          <p className="mb-6 text-sm text-slate-500">Entre com seu e-mail e senha.</p>

          <div className="mb-4">
            <label htmlFor="login-email" className={labelClass}>E-mail</label>
            <input id="login-email" className={inputClass} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-6">
            <label htmlFor="login-senha" className={labelClass}>Senha</label>
            <input id="login-senha" className={inputClass} type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>

          {erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{erro}</p>}

          <button
            type="submit"
            disabled={bloqueado || !email.trim() || !senha}
            className="w-full rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
