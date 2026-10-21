# Fluxo de chamados

Como um chamado anda da abertura ao fechamento na versão atual da plataforma. As regras de prioridade, de SLA e o prazo de triagem descritos aqui são **provisórios**: foram definidos pelo squad para o protótipo funcionar de ponta a ponta e continuam pendentes de confirmação do cliente (ver [Em aberto com o cliente](../README.md#em-aberto-com-o-cliente)). Todos ficam no backend e podem mudar sem alterar o frontend.

## Ciclo de vida

```
Aberto ──(atendente assume)──► Em triagem ──(conclui a triagem)──► Na fila ──(departamento assume)──► Em atendimento
  └────────────(conclui direto, sem assumir)───────────────────────────┘                          ├─► Aguardando
                                                                                                    ├─► Resolvido ─► Fechado
                                                                                                    └─► Transferência: volta a "Na fila" no novo departamento
```

| Etapa | Quem age | O que acontece |
|---|---|---|
| Abertura | Cliente, gestor de frota ou a Central em nome do cliente | O cliente escolhe **motivo** e **contexto**. Nada é classificado. O backend grava o prazo de triagem a partir da urgência do contexto. |
| Triagem | `ATENDENTE` ou `ADMIN` | O atendente assume o chamado na fila de triagem e define tipo, severidade e urgência. O formulário vem com uma sugestão tirada do motivo e do contexto, e só vale depois que ele confirma. O score gera a prioridade, e o chamado entra na fila do departamento. |
| Atendimento | `DEPARTAMENTO` (só a própria fila) e `ADMIN` | Assume o chamado, que passa a mostrar quem é o responsável. Também aguarda, resolve, fecha, transfere, registra mensagens e aciona fornecedor. Outra pessoa da fila pode assumir no lugar de quem está com o chamado. |
| Apoio da Central | `ATENDENTE` | Transfere, aciona fornecedor, registra mensagens e usa a lixeira. Não assume nem muda o status do atendimento. |
| Acompanhamento da liderança | `LIDER_OPERACIONAL` | Vê todos os chamados, o painel e as métricas, sem alterar nada. |
| Acompanhamento | Cliente | Vê as etapas, o histórico público, os anexos e as notificações. Anotações internas não aparecem. |

Antes da triagem não dá para mudar status, transferir nem acionar fornecedor: a API responde 409. Ninguém pode definir `Aberto` ou `Em triagem` manualmente.

## Quem pode o quê

| Ação | ADMIN | ATENDENTE | DEPARTAMENTO (própria fila) | LIDER_OPERACIONAL |
|---|---|---|---|---|
| Triagem, reclassificação e override | Sim | Sim | Não | Não |
| Assumir e mudar status do atendimento | Sim | Não | Sim | Não |
| Transferir, acionar fornecedor, mensagens, anexos e localização | Sim | Sim | Sim | Não |
| Lixeira (excluir, restaurar, esvaziar) | Sim | Sim | Não | Não |
| Métricas e exportação | Sim | Não | Não | Sim |

Transferir o chamado, ou devolvê-lo para `Na fila`, libera o responsável: o próximo que assumir passa a constar no lugar.

## Prazo de triagem

O prazo é contado desde a abertura e segue a urgência do contexto que o cliente escolheu.

| Urgência informada | Prazo | Variável |
|---|---|---|
| Alta (5) | 10 min | `TRIAGEM_URGENCIA_ALTA_MINUTOS` |
| Média (3) | 20 min | `TRIAGEM_URGENCIA_MEDIA_MINUTOS` |
| Baixa (1) | 40 min | `TRIAGEM_URGENCIA_BAIXA_MINUTOS` |

Na fila de triagem (`/triagem`), o cronômetro fica verde até a metade do prazo, amarelo a partir da metade e vermelho depois do limite.

## Prioridade e roteamento

- Score = severidade + urgência, com pesos 1, 3 ou 5.
- Prioridade pelo score: ≥ 10 é P1, ≥ 8 é P2, ≥ 6 é P3 e abaixo disso é P4.
- O departamento de destino é opcional na triagem. Sem ele, vale o tipo escolhido, com uma exceção: um P1 operacional (Assistência 24h, Manutenção ou Logística) fora do horário comercial vai para a **Assistência 24h** (plantão).
- A Central pode reclassificar ou definir a prioridade manualmente (override), sempre com justificativa.
- A reclassificação muda só a classificação e a prioridade. O departamento e o status ficam como estão, inclusive o departamento escolhido à mão na triagem. Para mudar de fila, use a transferência, que exige motivo. Um chamado fechado também pode ser reclassificado, para corrigir as métricas, e continua fechado.

## Serviço terceirizado

O fornecedor só avança o status: Solicitado → Recebido → Em execução → Concluído. Pode pular etapas para frente, mas não volta nem repete o status atual (409). Concluído é final. Serviços de chamados na lixeira não aparecem para o fornecedor e não podem ser atualizados (404).

## SLA

Os prazos de 1ª resposta e de resolução só existem depois da triagem. São contados desde a abertura, em horas corridas para P1 e P2 e em horário comercial para P3 e P4. Quando o chamado aguarda o **cliente**, o relógio de resolução fica pausado.

## Pontos de atenção

- A lista e o resumo do painel calculam a situação do SLA em memória. Isso serve para o volume do protótipo; com volume real, a situação deve ser materializada no banco.
- Os escalonamentos de 50%, 80% e 100% do SLA ainda não geram eventos no histórico. O painel só mostra a situação.
- A chave `Idempotency-Key` vale por usuário, tanto na abertura quanto nos anexos: dois usuários que mandem a mesma chave no mesmo chamado não recebem o anexo um do outro.
- Os anexos ficam em disco, em `ANEXO_DIR`. Retenção e exclusão pela LGPD continuam em aberto.
