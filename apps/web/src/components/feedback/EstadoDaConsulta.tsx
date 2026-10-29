import { CircleAlert, RefreshCw } from "lucide-react";
import { ErroApi } from "@/services/api/cliente";

export function mensagemDeErro(erro: unknown) {
  if (erro instanceof ErroApi) {
    if (erro.status === 401) return "Sua sessão expirou. Entre novamente.";
    if (erro.status === 403) return "Seu perfil não possui permissão para esta operação.";
    return erro.message;
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <RefreshCw size={14} className="animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

export function FalhaAoCarregar({ erro, aoTentarDeNovo }: { erro: unknown; aoTentarDeNovo?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <CircleAlert size={22} className="text-red-600" aria-hidden />
      <p className="text-sm font-semibold text-red-700">{mensagemDeErro(erro)}</p>
      {aoTentarDeNovo && (
        <button type="button" onClick={aoTentarDeNovo} className="alvo-toque rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function AvisoDeErro({ erro }: { erro: unknown }) {
  if (!erro) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      <CircleAlert size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
      {mensagemDeErro(erro)}
    </p>
  );
}
