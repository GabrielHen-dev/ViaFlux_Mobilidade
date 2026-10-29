"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { reenviarVerificacao } from "@/services/api/conta";
import { ErroApi } from "@/services/api/cliente";
import { useAuth } from "@/store/AuthContext";
import type { UsuarioAutenticado } from "@/types/auth";

export function emailPendente(usuario: UsuarioAutenticado) {
  return usuario.emailVerificado === false;
}

export default function AvisoDeEmailNaoVerificado({ usuario }: { usuario: UsuarioAutenticado }) {
  const { atualizarUsuario } = useAuth();
  const [enviando, setEnviando] = useState(false);

  if (!emailPendente(usuario)) return null;

  async function reenviar() {
    setEnviando(true);
    try {
      const resposta = await reenviarVerificacao(usuario.email);
      toast.success("Link reenviado", { description: resposta.mensagem });
    } catch (falha) {
      toast.error("Não foi possível reenviar o link", { description: falha instanceof ErroApi ? falha.message : "Tente novamente." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold"><MailWarning size={16} aria-hidden /> Confirme seu e-mail para abrir chamados</p>
      <p className="mt-1">Link de confirmação enviado para <strong>{usuario.email}</strong>.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" disabled={enviando} onClick={reenviar} className="text-xs font-semibold underline disabled:opacity-50">
          {enviando ? "Reenviando…" : "Reenviar link"}
        </button>
        <button type="button" onClick={() => void atualizarUsuario()} className="text-xs font-semibold underline">Verificar novamente</button>
      </div>
    </div>
  );
}
