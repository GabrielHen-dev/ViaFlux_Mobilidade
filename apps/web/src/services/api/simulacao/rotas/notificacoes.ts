import type { RotaSimulada } from "@/services/api/simulacao/roteador";
import type { Notificacao } from "@/types/chamado";
import { json, recusar, semConteudo } from "@/services/api/simulacao/resposta";
import { alterarEstado, carregarEstado, type NotificacaoSimulada } from "@/services/api/simulacao/estado";

function semDestinatario({ destinatarioId, ...notificacao }: NotificacaoSimulada): Notificacao {
  void destinatarioId;
  return notificacao;
}

export const rotasDeNotificacoes: RotaSimulada[] = [
  {
    metodo: "GET",
    padrao: "/api/notificacoes",
    tratar: async (contexto) => {
      if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
      const usuarioId = contexto.usuario.id;
      const minhas = carregarEstado().notificacoes
        .filter((notificacao) => notificacao.destinatarioId === usuarioId)
        .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
        .map(semDestinatario);
      return json(minhas);
    },
  },
  {
    metodo: "PATCH",
    padrao: "/api/notificacoes/:id/lida",
    tratar: async (contexto) => {
      if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
      const usuarioId = contexto.usuario.id;
      alterarEstado((estado) => {
        const notificacao = estado.notificacoes.find((item) => item.id === contexto.parametros.id && item.destinatarioId === usuarioId);
        if (!notificacao) recusar(404, "Notificação não encontrada.");
        notificacao.lida = true;
      });
      return semConteudo();
    },
  },
  {
    metodo: "POST",
    padrao: "/api/notificacoes/leitura",
    tratar: async (contexto) => {
      if (!contexto.usuario) recusar(401, "Autenticação é necessária para acessar este recurso.");
      const usuarioId = contexto.usuario.id;
      alterarEstado((estado) => {
        for (const notificacao of estado.notificacoes) if (notificacao.destinatarioId === usuarioId) notificacao.lida = true;
      });
      return semConteudo();
    },
  },
];
