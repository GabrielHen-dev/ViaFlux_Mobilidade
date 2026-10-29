"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { solicitarRedefinicaoDeSenha } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import CartaoDeAcesso, {
  ErroDeAcesso, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass,
} from "@/components/auth/CartaoDeAcesso";

export default function RecuperacaoDeSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await solicitarRedefinicaoDeSenha(email.trim());
      toast.success("Solicitação enviada", { description: resposta.mensagem });
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : "Não foi possível enviar a solicitação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CartaoDeAcesso
      titulo="Recuperar senha"
      subtitulo="Informe o e-mail cadastrado."
      rodape={<Link href="/login" className="font-semibold text-brand-green underline-offset-2 hover:underline">Voltar ao login</Link>}
    >
      <form onSubmit={enviar}>
        <div className="mb-4">
          <label htmlFor="recuperacao-email" className={labelDeAcessoClass}>E-mail</label>
          <input id="recuperacao-email" className={campoDeAcessoClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <ErroDeAcesso mensagem={erro} />
        <button type="submit" disabled={enviando || !email.trim()} className={botaoDeAcessoClass}>
          {enviando ? "Enviando…" : "Enviar link"}
        </button>
      </form>
    </CartaoDeAcesso>
  );
}
