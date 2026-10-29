"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { cadastrarConta } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import CartaoDeAcesso, {
  AvisoDeAcesso, ErroDeAcesso, ErroDoCampo, botaoDeAcessoClass, campoDeAcessoClass, labelDeAcessoClass, linkDeAcessoClass,
} from "@/components/auth/CartaoDeAcesso";

const SENHA_MINIMA = 8;

type Campo = "nome" | "email" | "senha" | "confirmacao" | "telefone" | "aceiteDosTermos";

function propriedadesDoCampo(campo: Campo, erros: Partial<Record<Campo, string>>) {
  const id = `cadastro-${campo}`;
  return { id, "aria-invalid": erros[campo] ? true : undefined, "aria-describedby": erros[campo] ? `${id}-erro` : undefined };
}

export default function CadastroForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function validar() {
    const encontrados: Partial<Record<Campo, string>> = {};
    if (!nome.trim()) encontrados.nome = "Informe seu nome.";
    if (!email.trim()) encontrados.email = "Informe o e-mail.";
    if (senha.length < SENHA_MINIMA) encontrados.senha = `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
    if (confirmacao !== senha) encontrados.confirmacao = "As senhas não conferem.";
    if (!aceite) encontrados.aceiteDosTermos = "É preciso aceitar os termos de uso e a política de privacidade.";
    return encontrados;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const encontrados = validar();
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      const resposta = await cadastrarConta({
        nome: nome.trim(), email: email.trim(), senha, telefone: telefone.trim() || undefined, aceiteDosTermos: aceite,
      });
      setConcluido(resposta.mensagem);
    } catch (falha) {
      if (falha instanceof ErroApi) {
        setErros(falha.campos as Partial<Record<Campo, string>>);
        setErro(falha.message);
      } else {
        setErro("Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <CartaoDeAcesso titulo="Confirme seu e-mail" subtitulo="Falta só um passo para abrir chamados.">
        <AvisoDeAcesso mensagem={concluido} />
        <p className="mb-6 text-sm text-slate-600">
          Abra o link que enviamos para <strong>{email.trim()}</strong>. Ele vale por 24 horas. Você já pode entrar, mas só consegue abrir chamados depois de confirmar o e-mail.
        </p>
        <Link href="/login" className={`${botaoDeAcessoClass} block text-center`}>Ir para o login</Link>
      </CartaoDeAcesso>
    );
  }

  return (
    <CartaoDeAcesso
      titulo="Criar conta"
      subtitulo="Para clientes e motoristas. Gestores de frota e parceiros recebem o acesso da ViaFlux."
      rodape={<>Já tem conta? <Link href="/login" className="font-semibold text-brand-green underline-offset-2 hover:underline">Entrar</Link></>}
    >
      <form noValidate onSubmit={enviar} className="space-y-4">
        <div>
          <label htmlFor="cadastro-nome" className={labelDeAcessoClass}>Nome *</label>
          <input {...propriedadesDoCampo("nome", erros)} className={campoDeAcessoClass} autoComplete="name" maxLength={150} value={nome} onChange={(e) => setNome(e.target.value)} />
          <ErroDoCampo id="cadastro-nome-erro" mensagem={erros.nome} />
        </div>
        <div>
          <label htmlFor="cadastro-email" className={labelDeAcessoClass}>E-mail *</label>
          <input {...propriedadesDoCampo("email", erros)} className={campoDeAcessoClass} type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          <ErroDoCampo id="cadastro-email-erro" mensagem={erros.email} />
        </div>
        <div>
          <label htmlFor="cadastro-telefone" className={labelDeAcessoClass}>Telefone</label>
          <input {...propriedadesDoCampo("telefone", erros)} className={campoDeAcessoClass} type="tel" autoComplete="tel" maxLength={30} placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <ErroDoCampo id="cadastro-telefone-erro" mensagem={erros.telefone} />
        </div>
        <div>
          <label htmlFor="cadastro-senha" className={labelDeAcessoClass}>Senha *</label>
          <input {...propriedadesDoCampo("senha", erros)} className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
          <ErroDoCampo id="cadastro-senha-erro" mensagem={erros.senha} />
        </div>
        <div>
          <label htmlFor="cadastro-confirmacao" className={labelDeAcessoClass}>Confirme a senha *</label>
          <input {...propriedadesDoCampo("confirmacao", erros)} className={campoDeAcessoClass} type="password" autoComplete="new-password" maxLength={72} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <ErroDoCampo id="cadastro-confirmacao-erro" mensagem={erros.confirmacao} />
        </div>
        <div>
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input {...propriedadesDoCampo("aceiteDosTermos", erros)} type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-green" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>Li e aceito os termos de uso e a política de privacidade do ViaFlux.</span>
          </label>
          <ErroDoCampo id="cadastro-aceiteDosTermos-erro" mensagem={erros.aceiteDosTermos} />
        </div>

        <ErroDeAcesso mensagem={erro} />

        <button type="submit" disabled={enviando} className={botaoDeAcessoClass}>
          {enviando ? "Criando conta…" : "Criar conta"}
        </button>
        <p className="text-center text-xs text-slate-500">
          Não recebeu o e-mail de uma conta anterior? <Link href="/verificar-email" className={linkDeAcessoClass}>Reenviar confirmação</Link>
        </p>
      </form>
    </CartaoDeAcesso>
  );
}
