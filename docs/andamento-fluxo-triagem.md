# Andamento: fluxo de triagem, localização e backend completo

Situação em 21/10/2026. Trabalho feito na branch `develop`, **sem commit**. Este documento registra o que foi pedido, o que já está pronto, onde o trabalho parou e o que falta, em ordem de execução.

## O que foi pedido

1. **Cliente — localização.** O GPS vira rua e endereço. O cliente pode complementar e informar o CEP. Se não souber o CEP, digita o nome da rua com autocomplete ou usa a localização do aparelho, que preenche todos os campos.
2. **Atendente — triagem manual.** A classificação deixa de ser automática. O chamado chega a uma **fila de triagem**, com timer. O atendente classifica a partir do que o cliente informou, e só depois o chamado vai para a fila do departamento.
3. **Departamentos (Manutenção, TI etc.).** Não tinham fluxo e recebiam erro de acesso (403).
4. **Backend.** Implementar tudo o que o frontend ainda simulava no navegador.
5. **SOLID** no backend e no frontend.

## Decisões tomadas com o Gabriel

| Tema | Decisão |
|---|---|
| Prazo da triagem | A documentação não define. Usa a **urgência informada pelo cliente** (o contexto escolhido na abertura): alta 10 min, média 20 min, baixa 40 min. Configurável por `TRIAGEM_URGENCIA_*_MINUTOS`. É um prazo provisório até o cliente formalizar. |
| Endereço | **OpenStreetMap Nominatim** (GPS → endereço e busca de rua) e **ViaCEP** (CEP), gratuitos e sem chave, chamados pelo backend. |

## Causa do erro de acesso dos departamentos

A fila do departamento usava a simulação do frontend, e a simulação buscava a lista no backend real com `GET /api/chamados`. O `SecurityConfig` antigo não liberava o perfil `DEPARTAMENTO` nessa rota, por isso o 403. A correção está pronta no backend novo: o departamento enxerga os chamados triados do(s) seu(s) departamento(s).

## Novo ciclo do chamado

```
Aberto ──(atendente assume)──► Em triagem ──(conclui triagem)──► Na fila ──(departamento assume)──► Em atendimento
  └──────────(conclui direto, sem assumir)──────────────────────────┘                        ├─► Aguardando (cliente pausa o SLA de resolução)
                                                                                               ├─► Resolvido ─► Fechado
                                                                                               └─► Transferência: volta a "Na fila" no novo departamento
```

- **Na abertura:** o cliente escolhe motivo e contexto. Nada é classificado ainda. O backend grava o **prazo de triagem** a partir da urgência do contexto.
- **Na triagem:** o atendente define tipo, severidade e urgência, e o score dá a prioridade (P1–P4). O departamento de destino é opcional. Sem ele, vale a regra de plantão: um P1 operacional fora do horário comercial vai para a Assistência 24h.
- **Status novo:** `Na fila` (`NA_FILA`).
- **Restrições:** antes da triagem não dá para mudar status, transferir nem acionar fornecedor (409). `Aberto` e `Em triagem` não podem ser definidos manualmente.
- **SLA:** o de 1ª resposta e o de resolução (P1–P4, em horário comercial para P3/P4) só existem depois da triagem e são contados desde a abertura.

## Pronto

### Backend (`apps/api`) — compila (`./mvnw -o compile`)

**Migração `V11__fluxo_completo_de_chamados.sql`**
- Tabelas `motivo` e `contexto`, com a matriz de 30 motivos e 30 contextos que antes ficava em `simulacao/matriz.ts`.
- Colunas novas em `chamados`: classificação, override, departamento, triagem, SLA, lixeira, idempotência e localização estruturada.
- Tabelas novas: `chamado_pausa`, `chamado_anexo`, `servico_terceiro`, `servico_atualizacao` e `notificacao`. Também a coluna `organizacao.especialidade`.
- Converte os chamados antigos: os `ABERTO`/`EM_TRIAGEM` voltam para a fila de triagem; os demais recebem a classificação antiga (Crítica/Alta/Média/Baixa → pesos).
- Em `chamado_evento`, `icone` vira `tipo`, e entram as colunas de autor e `visivel_cliente`.
- Remove as colunas `chamados.tipo` e `chamados.prioridade`.

**Organização por responsabilidade (pacote `chamado`)**

| Responsabilidade | Classes |
|---|---|
| Regras de transição (triagem, status, transferência, override, lixeira) | `Chamado` (entidade rica), `Localizacao`, `PausaDoChamado` |
| Políticas | `PoliticaDeTriagem` (prazo pela urgência), `PoliticaDeSla`, `RegraDeRoteamento` (interface) + `RoteamentoComPlantao` |
| Relógios do SLA | pacote `chamado.sla`: interface `Relogio`, `RelogioCorrido`, `RelogioDeHorasUteis`, `AvaliacaoDePrazo`, `SituacaoPrazo`, `Pausa` |
| Acesso por perfil e departamento | `AcessoAosChamados`, mais `usuario.UsuarioAtual` e `usuario.IdentificacaoDoUsuario` |
| Montagem das respostas | `MontagemDeChamado` e os records `*Response` |
| Casos de uso | `AberturaDeChamadoService`, `ConsultaDeChamadosService`, `TriagemService`, `AtendimentoService`, `LixeiraService`, `AnexoService`, `ServicoTerceiroService`, `MetricasService` (que usa `ColetaDeMetricas`, `CalculoDeMetricas` e `ExportacaoDeMetricas`) |
| Abstrações de infraestrutura (inversão de dependência) | `ArmazenamentoDeArquivos` → `ArmazenamentoEmDisco`; `CanalDeNotificacao` → `notificacao.CentralDeNotificacoes`; `java.time.Clock` como bean |
| Controllers finos | `ChamadoController`, `TriagemController`, `AnexoController`, `ServicoTerceiroController`, `ClassificacaoController`, `MetricasController`, `notificacao.NotificacaoController` |

**Endpoints**

| Método e rota | Quem pode usar |
|---|---|
| `POST /api/chamados` (header `Idempotency-Key`) | CLIENTE, GESTOR_FROTA, ADMIN, ATENDENTE |
| `GET /api/chamados?busca&status&prioridade&departamento&sla&etapa=TRIAGEM\|ATENDIMENTO&ordenacao&page&size` | Todos os perfis com chamados; cada um vê só o que tem acesso |
| `GET /api/chamados/resumo` (inclui o bloco `triagem`: aguardando, em andamento, em risco, atrasados, próximo limite) | Central |
| `GET /api/chamados/{codigo}` | Quem tem acesso ao chamado |
| `POST /api/chamados/{codigo}/triagem/inicio` e `POST /api/chamados/{codigo}/triagem` | ADMIN, ATENDENTE |
| `PUT /classificacao`, `PUT /override`, `DELETE /override` | ADMIN, ATENDENTE |
| `PATCH /status`, `POST /transferencias` | Central; o departamento só nos chamados da própria fila |
| `POST /atualizacoes`, `PUT /localizacao`, `POST /anexos` (multipart `arquivo`), `GET /anexos/{id}/conteudo` | Quem tem acesso ao chamado |
| `DELETE /api/chamados/{codigo}`, `GET/DELETE /api/chamados/lixeira[/{codigo}]`, `POST /restauracao` | ADMIN, ATENDENTE, LIDER_OPERACIONAL |
| `GET /api/fornecedores`, `POST/DELETE /api/chamados/{codigo}/servicos[/{id}]` | Central |
| `GET /api/fornecedor/servicos`, `PATCH /api/fornecedor/servicos/{id}/status` | FORNECEDOR |
| `GET/PATCH/POST /api/notificacoes...` | Qualquer usuário autenticado |
| `GET /api/metricas`, `GET /api/metricas/exportacao` (CSV) | ADMIN, LIDER_OPERACIONAL |
| `GET /api/classificacao/motivos`, `GET /api/classificacao/contextos?tipo`, `GET /api/departamentos` | Qualquer usuário autenticado |
| `GET /api/enderecos/cep/{cep}`, `/reverso?latitude&longitude`, `/busca?q&latitude&longitude` | Qualquer usuário autenticado |

**Configuração**
- `SecurityConfig`: as regras estão reescritas para todas essas rotas, e o CORS agora aceita o header `Idempotency-Key` e expõe `Content-Disposition`.
- `application.yml`: blocos `viaflux.triagem`, `viaflux.anexos` e `viaflux.enderecos`, e limite de upload `spring.servlet.multipart`.
- Variáveis documentadas em `infra/.env.example` e `infra/README.md`.

**Dados de exemplo:** o seed do `/dev-tools` (`PopuladorDeDados` e `DadosDeExemplo`) cria chamados com motivo e contexto. Uma parte fica na fila de triagem, com aberturas recentes para os timers variarem; o resto já sai triado. As organizações fornecedoras recebem especialidade.

### Endereço (feito por um subagente) — testado

- **Backend:** pacote `endereco` (`EnderecoController`, `EnderecoService`, limitador de 1 requisição/s para o Nominatim, cache de 6 h, timeouts de 3 s/5 s). Tem 26 testes com `MockRestServiceServer`. Eles passaram numa cópia isolada, porque o módulo inteiro ainda não compila os testes (ver abaixo).
- **Frontend:** `services/api/enderecos.ts`, `utils/endereco.ts`, `CampoDeLocalizacao.tsx` refeito (GPS → endereço, CEP com máscara, autocomplete de rua acessível por teclado, número, complemento/referência, bairro, cidade, UF) e `LocalizacaoDoChamado.tsx` (exibe o endereço estruturado e um link para o OpenStreetMap). 12 testes novos em `tests/unit/endereco.test.tsx`; a suíte unitária passou com 54 de 54 antes das mudanças de tipo abaixo.
- **Tipo `Localizacao`:** ganhou `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade` e `uf`.

## Concluído em 21/10/2026

### Backend validado
- A V11 rodou num Postgres descartável, e o Hibernate recusou o mapeamento: as colunas de peso e de prazo estavam como `SMALLINT` e as entidades usam `int`/`Integer`. Corrigido na própria V11, que ainda não tinha sido aplicada em nenhum banco: as colunas passaram a `INTEGER`.
- Um teste de fumaça HTTP com os usuários de exemplo passou pelo ciclo inteiro:
  - abertura com idempotência;
  - fila e resumo da triagem;
  - departamento sem 403, vendo só a própria fila;
  - 409 antes da triagem;
  - assumir e concluir a triagem, com P2 = 5 + 3;
  - pausa do SLA ao aguardar o cliente;
  - mensagens públicas e internas;
  - anexo com download;
  - fornecedor;
  - transferência;
  - notificações;
  - reclassificação e override;
  - métricas e CSV;
  - lixeira.
- ViaCEP e Nominatim reais foram testados: CEP, endereço pelo GPS e busca de rua.
- O seed agora grava o **id** do atendente de exemplo como responsável e como quem triou, além do nome. Antes, a fila de triagem não reconhecia o atendente como responsável pelos chamados do seed.
- Dois bugs corrigidos, com testes:
  - Resolver direto da fila agora registra a 1ª resposta. Antes, o SLA de 1ª resposta continuava correndo e o P1 resolvido seguia no alerta.
  - `page` muito grande estourava o `int` em `ChamadosPageResponse` e devolvia 500.
- Testes: `./mvnw test` passa com **279 testes, 0 falhas**, incluindo os Testcontainers.
  - Reescritos para o contrato novo: `ChamadoControllerTests`, `SecurityConfigTests`, os testes de OpenAPI e `ViafluxApplicationTests`.
  - `ChamadoServiceTests` virou `AberturaDeChamadoServiceTests` e `ConsultaDeChamadosServiceTests`.
  - Novos: `ChamadoTests`, `PoliticaDeTriagemTests`, `PoliticaDeSlaTests`, `RoteamentoComPlantaoTests`, `AcessoAosChamadosTests`, `TriagemServiceTests`, `AnexoServiceTests` (com armazenamento em memória), `ServicoTerceiroServiceTests`, `CalculoDeMetricasTests`, `RelogioDeHorasUteisTests` e `AvaliacaoDePrazoTests`.

### Frontend ligado ao backend
- A simulação foi removida: `services/api/simulacao/` e `tests/unit/simulacao.test.ts` saíram, e `transporte.ts` usa só a rede.
  - O `/dev-tools` deixou de limpar o estado simulado e agora limpa só os rascunhos.
  - As ações de exemplo (fornecedor, transferência e override) passaram a ir à API e só em chamados já triados.
- `types/chamado.ts` foi atualizado:
  - status `Na fila` e evento `TRIAGEM`;
  - prioridade, score e classificação podem ser `null`;
  - campo `triagem` e `ResumoChamados.triagem`.
- Novo contrato: `iniciarTriagem` e `concluirTriagem`.

### Fluxo de triagem no frontend
- Rota `/triagem` com a fila:
  - itens ordenados pelo limite;
  - cronômetro ao vivo, que fica amarelo na metade do prazo e vermelho ao estourar;
  - responsável;
  - botões "Assumir" e "Continuar".
- `Triagem.tsx` virou uma casca que escolhe o modo:
  - antes da triagem, `ConclusaoDaTriagem`, que permite assumir, mostra o prazo e traz o formulário pré-preenchido com a sugestão do cliente;
  - depois, `Reclassificacao` e `OverrideDePrioridade`.
- Dashboard dividido em `painel/` (filtros, tabela e alertas), com:
  - filtro de etapa;
  - contadores da triagem;
  - "Aguardando triagem" no lugar da prioridade;
  - prazo da triagem no lugar do SLA;
  - link "Triar";
  - sem exclusão para o departamento.
- Detalhes:
  - "Assumir chamado" só aparece com o status `Na fila`;
  - "Fazer triagem" enquanto não houver triagem;
  - transferência e fornecedor só depois da triagem;
  - "Excluir" só para a visão global.
- Encaminhamento: bloqueado antes da triagem e sem as opções Aberto e Em triagem.
- `NovoChamado` dividido em `forms/novo-chamado/` (formulário, hook de envio, seções e confirmação). A confirmação mostra "Aguardando triagem" e a previsão da análise. Rascunhos antigos sem os campos novos de localização são completados.
- Portal do cliente: etapas do chamado (Recebido → Em análise → Encaminhado → Em atendimento → Resolvido), com a previsão da triagem.
- Menu: item "Triagem" para quem tria; a Lixeira aparece só para a visão global.
- Métricas: os indicadores `tempo-triagem` e `triagem-no-prazo` já vêm da API e aparecem sem mudança de tela.

### Testes e verificação do frontend
- `tests/support/backendFalso.ts` foi reescrito com o contrato novo, em memória e com os textos da API real.
- Resultados:
  - lint e typecheck sem erros, e o build passa;
  - **43 testes unitários** passando;
  - **4 testes e2e** passando, entre eles o ciclo cliente → triagem → departamento/Central → fornecedor → cliente.
- Neste ambiente o e2e rodou com `PLAYWRIGHT_CHANNEL=chrome`, porque os navegadores do Playwright não estão instalados.
- O fluxo também foi verificado no navegador contra a API real: atendente, departamento Assistência 24h e cliente, inclusive em 360 px e com o CEP real.

### Documentação
- Novo `docs/fluxo-de-chamados.md` com o ciclo, a triagem, a prioridade e o SLA.
- Atualizados:
  - `README.md`: aviso de decisão pendente sobre SLA e prazos, pergunta nova em "Em aberto com o cliente", e como rodar o frontend;
  - `docs/stack.md`;
  - `apps/web/README.md`;
  - `apps/web/src/services/api/README.md`;
  - `apps/web/IMPLEMENTACAO.md`.

## O que ainda falta

- [ ] **Decidir com o cliente** se SLA e prazos de triagem entram nesta fase e com quais valores. O README e o `docs/stack.md` ainda dizem que prioridade e SLA estão fora do MVP; o código tem versões provisórias.
- [x] Perfis ajustados em 21/10/2026:
  - o Líder só acompanha (painel, detalhes e métricas);
  - o Atendente faz a triagem e as ações da Central, mas não assume nem muda o status do atendimento;
  - a lixeira ficou com ADMIN e ATENDENTE;
  - o chamado registra quem assumiu o atendimento, com o endpoint `POST /api/chamados/{codigo}/atendimento` e a migração `V12`. Outra pessoa da fila pode assumir no lugar.
  - Por decisão, o Gestor de frota continua vendo só os chamados que ele mesmo abriu.
- [x] Timeline corrigida em 21/10/2026. Eventos gravados no mesmo instante (abertura + aguardando triagem, triagem concluída + encaminhamento, transferência + encaminhamento) saíam em ordem aleatória, porque o desempate era pelo id (UUID). A migração `V13` cria `chamado_evento.sequencia` e a timeline passou a ser ordenada por horário e sequência. O seed também foi corrigido: cada evento tem o autor certo, os horários ficam proporcionais em vez de colados e "Última atualização" segue o último evento.
- [ ] Aplicar a V11, a V12 e a V13 no banco `viaflux` de desenvolvimento. **Antes, pare a API antiga da porta 8281**, porque a V11 remove `chamados.tipo` e `chamados.prioridade`. Observação: o container `viaflux-dev-db` usa a porta 5432, que hoje está ocupada por outro projeto.
- [x] Pontos da revisão dos testes, corrigidos em 21/10/2026:
  - **Reclassificação:** não transfere mais o chamado. Muda só a classificação e a prioridade, mantém o departamento (inclusive o escolhido à mão) e o status, e funciona em chamado fechado. O histórico registra em que departamento o chamado continua, e a tela aponta para a transferência.
  - **Fornecedor:** o status só avança, e Concluído é final. Serviço de chamado na lixeira dá 404.
  - **Anexos:** a chave de idempotência agora vale por usuário, como na abertura.
- [ ] Anexos: o tipo do conteúdo ainda vem do cliente, sem conferir os bytes do arquivo.
- [ ] Portar os escalonamentos de SLA (eventos de 50%, 80% e 100%), se o cliente confirmar o SLA.
- [ ] Recarregar a página sem rede volta para o login, porque a renovação da sessão falha. O rascunho do chamado não se perde.
- [ ] Criar a branch `feat/...` e commitar em partes: migração e backend, endereço, frontend.

## Riscos e pontos de atenção

- **Lista carregada em memória.** A lista e o resumo carregam todos os chamados visíveis e filtram e paginam em memória, porque a situação do SLA é calculada. Serve para o protótipo; com volume real, convém materializar a situação no banco.
- **Escalonamentos de SLA.** Os eventos de 50%, 80% e 100% que a simulação gravava na timeline não foram portados. O painel mostra a situação, mas não gera esses eventos.
- **Fornecedores.** A lista fixa de fornecedores da simulação saiu. Agora valem só as organizações do tipo FORNECEDOR, com a especialidade opcional.
- **Anexos em disco.** Ficam em `ANEXO_DIR` (em produção, no volume `anexos`). Retenção e exclusão pela LGPD continuam em aberto.
- **Banco isolado.** A validação de 21/10 usou um container descartável, `viaflux-triagem-validacao` (porta 55491), e não tocou no `viaflux-dev-db`. O container já foi removido.
