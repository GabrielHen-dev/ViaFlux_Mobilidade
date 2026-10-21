# Implementação do frontend ViaFlux

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query e Zod. Todas as telas exigem login e usam a API Spring Boot de `apps/api`. Não há simulação no navegador nem dados fictícios: a camada `services/api/simulacao/`, que imitava os endpoints que faltavam, foi removida quando o backend passou a cobrir o ciclo completo do chamado.

O ciclo do chamado, a triagem manual, a prioridade e o SLA estão descritos em [`docs/fluxo-de-chamados.md`](../../docs/fluxo-de-chamados.md).

## Rotas

Todas ficam no grupo `src/app/(central)/` e passam pela verificação de sessão de `components/auth/AreaProtegida.tsx`. Cada tela confere o perfil com `PerfilRequerido`.

| Rota | Tela | Perfis |
|---|---|---|
| `/` | Dashboard (visão global) ou fila do departamento | ADMIN, ATENDENTE, LIDER_OPERACIONAL, DEPARTAMENTO |
| `/triagem` | Fila de triagem com cronômetro e "Assumir" | ADMIN, ATENDENTE |
| `/chamados/novo` | Abertura de chamado | CLIENTE, GESTOR_FROTA, ADMIN, ATENDENTE |
| `/chamados/[id]` | Detalhes, timeline, anexos, localização e fornecedor | Central |
| `/chamados/[id]/triagem` | Conclusão da triagem; depois, reclassificação e override | ADMIN, ATENDENTE |
| `/chamados/[id]/encaminhamento` | Transferência (e status, para quem atende), só depois da triagem | ADMIN, ATENDENTE, DEPARTAMENTO |
| `/chamados/[id]/acompanhamento` | Acompanhamento do serviço terceirizado | Central |
| `/portal`, `/portal/chamados/[id]` | Portal do cliente, com as etapas do chamado | CLIENTE, GESTOR_FROTA |
| `/fornecedor` | Serviços do fornecedor | FORNECEDOR |
| `/metricas` | Indicadores e exportação CSV | ADMIN, LIDER_OPERACIONAL |
| `/lixeira` | Lixeira | ADMIN, ATENDENTE |
| `/usuarios`, `/dev-tools` | Gestão de usuários e dados de exemplo | ADMIN |

## Organização

```text
src/
├── app/(central)/          Rotas (páginas finas que só montam o componente)
├── components/
│   ├── chamados/           Dashboard, detalhes, timeline, anexos, localização, lixeira
│   │   └── painel/         Filtros, tabela e alertas do Dashboard
│   ├── triagem/            Fila, prazo da triagem, conclusão, reclassificação, override e campos comuns
│   ├── forms/              Triagem (casca), encaminhamento, serviço terceirizado, localização
│   │   └── novo-chamado/   Esquema e rascunho, hook de envio, seções e confirmação
│   ├── portal/             Portal e etapas do chamado para o cliente
│   └── ui/, layout/, auth/, feedback/, metricas/, fornecedor/, admin/, devtools/
├── hooks/consultas.ts      Consultas e mutações do TanStack Query
├── services/api/           Cliente HTTP e funções por recurso
├── store/AuthContext.tsx   Sessão, renovação do token e ClienteApi
├── types/                  Contratos de resposta da API
└── utils/                  Datas, prioridade, perfis, endereço e anexos
```

As telas dependem dos hooks de `consultas.ts` e das funções de `services/api/`, que recebem um `ClienteApi`. Nenhuma tela chama `fetch` direto. Os componentes maiores foram divididos por responsabilidade:

- **Abertura:** `NovoChamado` só compõe as partes. O esquema, o rascunho e o hook de envio ficam em `forms/novo-chamado/`.
- **Dashboard:** filtros, tabela e alertas ficam em `chamados/painel/`.
- **Triagem:** a casca `forms/Triagem.tsx` escolhe o modo: `ConclusaoDaTriagem` antes da triagem, e `Reclassificacao` com `OverrideDePrioridade` depois.

## Triagem na interface

- **Fila de triagem (`/triagem`).** Mostra os chamados com `etapa=TRIAGEM`, do prazo mais curto para o mais longo. O cronômetro (`PrazoDaTriagem`) fica verde, fica amarelo a partir da metade do prazo e fica vermelho depois do limite.
- **Conclusão.** O formulário vem com a sugestão tirada do motivo e do contexto do cliente (`sugestaoDoCliente`). Nada é aplicado sem a confirmação do atendente. O departamento é opcional: no automático vale a regra de plantão do backend.
- **Antes da triagem:**
  - A prioridade aparece como "Aguardando triagem".
  - O Dashboard troca o SLA pelo prazo da triagem.
  - Encaminhamento, status e fornecedor ficam bloqueados.
  - O cliente vê a etapa "Em análise" com a previsão.
- **Departamento:** vê só os chamados triados da própria fila. Não tem lixeira nem exclusão.

## Perfis na interface

Os grupos de perfis ficam em `utils/perfis.ts` e espelham as regras do backend:

- `PERFIS_QUE_ATENDEM` (ADMIN e DEPARTAMENTO): botão **Assumir chamado** (ou "Assumir no lugar de…") e o bloco de status no encaminhamento. O responsável aparece nos detalhes e na tabela do painel.
- `PERFIS_QUE_CONDUZEM` (ADMIN, ATENDENTE e DEPARTAMENTO): transferência, fornecedor, mensagens, anexos e localização. Para os outros perfis, a timeline, os anexos e a localização ficam **somente leitura**.
- `PERFIS_DA_LIXEIRA` (ADMIN e ATENDENTE): exclusão e a tela de lixeira.
- O Líder vê o painel, os detalhes e as métricas, sem nenhuma ação.

## Testes

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

- **Unitários (Vitest e Testing Library), em `tests/unit/`:**
  - Regras: matriz de prioridade, prazo da triagem, sugestão, menu por perfil, contagem regressiva e anexos.
  - Fluxos: abertura, rascunho, abertura pela Central, triagem, bloqueio antes da triagem, fila do departamento e Dashboard.
  - Endereço.
- **E2E (Playwright), em `tests/e2e/prototipo.spec.ts`:**
  - Ciclo completo: cliente abre → atendente tria → Central atende → fornecedor atualiza → cliente acompanha.
  - Menus por perfil.
  - Celular em 360 px, com queda de rede e reenvio sem duplicar.
  - Rotas diretas.
- **Backend falso.** Os dois tipos de teste usam `tests/support/backendFalso.ts`, um backend em memória que segue o contrato e os textos da API real (triagem, SLA, notificações, fornecedor, anexos). A matriz de motivos e contextos fica em `tests/support/matriz.ts`.

O Playwright sobe `next start` na porta 3100, então rode `build` antes. Sem os navegadores do Playwright instalados, use o Chrome da máquina com `PLAYWRIGHT_CHANNEL=chrome`.

## Limitações conhecidas

- Se a página for recarregada sem rede, a renovação da sessão falha e a aplicação volta para o login. O rascunho do chamado continua salvo e é recuperado depois de entrar de novo.
- O painel atualiza por polling (15 s). Não há push em tempo real.
- Os prazos de triagem e de SLA são provisórios e vêm do backend (ver `docs/fluxo-de-chamados.md`).
