import type { RotaSimulada } from "@/services/api/simulacao/roteador";
import { TIPOS_CHAMADO, type TipoChamado } from "@/types/chamado";
import { json, recusar } from "@/services/api/simulacao/resposta";
import { CONTEXTOS, MOTIVOS } from "@/services/api/simulacao/matriz";

export const rotasDeClassificacao: RotaSimulada[] = [
  {
    metodo: "GET",
    padrao: "/api/classificacao/motivos",
    tratar: async () => json(MOTIVOS),
  },
  {
    metodo: "GET",
    padrao: "/api/classificacao/contextos",
    tratar: async (contexto) => {
      const tipo = contexto.consulta.get("tipo");
      if (tipo && !TIPOS_CHAMADO.includes(tipo as TipoChamado)) recusar(400, "O tipo informado não é válido.");
      return json(tipo ? CONTEXTOS.filter((item) => item.tipo === tipo) : CONTEXTOS);
    },
  },
];
