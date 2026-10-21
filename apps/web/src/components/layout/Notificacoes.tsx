"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { marcarNotificacaoComoLida, marcarTodasComoLidas } from "@/services/api/operacao";
import { useApi, useUsuarioAutenticado } from "@/store/AuthContext";
import { chaves, useNotificacoes } from "@/hooks/consultas";
import { formatarDataHora } from "@/utils/date";
import { PERFIS_DE_CLIENTE, usuarioTemPerfil } from "@/utils/perfis";
import { cn } from "@/utils/cn";

export default function Notificacoes() {
  const api = useApi();
  const usuario = useUsuarioAutenticado();
  const clienteDeConsultas = useQueryClient();
  const notificacoes = useNotificacoes();
  const [aberta, setAberta] = useState(false);
  const painel = useRef<HTMLDivElement>(null);
  const naoLidas = notificacoes.data?.filter((notificacao) => !notificacao.lida).length ?? 0;
  const ehCliente = usuarioTemPerfil(usuario, PERFIS_DE_CLIENTE);
  const aposLeitura = { onSuccess: () => void clienteDeConsultas.invalidateQueries({ queryKey: chaves.notificacoes }) };
  const lerUma = useMutation({ mutationFn: (id: string) => marcarNotificacaoComoLida(api, id), ...aposLeitura });
  const lerTodas = useMutation({ mutationFn: () => marcarTodasComoLidas(api), ...aposLeitura });

  useEffect(() => {
    if (!aberta) return;
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (painel.current && !painel.current.contains(evento.target as Node)) setAberta(false);
    };
    const fecharComEsc = (evento: KeyboardEvent) => { if (evento.key === "Escape") setAberta(false); };
    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [aberta]);

  return (
    <div className="relative" ref={painel}>
      <button
        type="button"
        onClick={() => setAberta((atual) => !atual)}
        aria-expanded={aberta}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
        className="alvo-toque relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <Bell size={18} aria-hidden />
        {naoLidas > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{naoLidas}</span>}
      </button>
      {aberta && (
        <div className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white text-left shadow-xl md:left-0 md:right-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-brand-navy">Notificações</span>
            {naoLidas > 0 && <button type="button" onClick={() => lerTodas.mutate()} className="text-xs font-semibold text-brand-blue">Marcar todas como lidas</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {(notificacoes.data ?? []).length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">Nenhuma notificação.</li>}
            {notificacoes.data?.map((notificacao) => (
              <li key={notificacao.id} className={cn("border-b border-slate-50 px-4 py-3 text-xs", !notificacao.lida && "bg-blue-50/60")}>
                <Link
                  href={ehCliente ? `/portal/chamados/${notificacao.chamadoId}` : `/chamados/${notificacao.chamadoId}`}
                  onClick={() => { if (!notificacao.lida) lerUma.mutate(notificacao.id); setAberta(false); }}
                  className="block"
                >
                  <span className="font-bold text-brand-blue">{notificacao.chamadoId}</span> · <span className="font-semibold text-brand-dark">{notificacao.novoStatus}</span>
                  <span className="mt-0.5 block text-slate-600">{notificacao.mensagem}</span>
                  <span className="mt-0.5 block text-slate-400">{formatarDataHora(notificacao.criadaEm)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
