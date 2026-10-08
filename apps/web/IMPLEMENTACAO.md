# Implementação do protótipo ViaFlux

A implementação ficou restrita a `apps/web`. O diretório inicialmente continha apenas Dockerfile, .dockerignore e public/.gitkeep; não existiam package.json, tsconfig, configuração Next.js, componentes ou estilos para reaproveitar. A aplicação foi criada sobre a stack solicitada, com Next.js 16.4.0 e App Router. O Dockerfile existente foi preservado. `apps/api` e `infra` não foram alterados.

Todos os arquivos de referência foram lidos em `C:/Users/ferdi/Downloads/ViaFlux/src`: App.tsx, main.tsx, index.css, vite-env.d.ts, as sete telas, Sidebar.tsx e StatusBadge.tsx. Seus textos, seções, SVGs, cores, formulários, filtros e confirmações orientaram a implementação.

A árvore relevante final é:

```text
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── chamados/
│   │   ├── novo/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── triagem/page.tsx
│   │       ├── encaminhamento/page.tsx
│   │       └── acompanhamento/page.tsx
│   └── lixeira/page.tsx
├── components/
│   ├── chamados/
│   │   ├── Dashboard.tsx
│   │   ├── DetalhesChamado.tsx
│   │   ├── TimelineChamado.tsx
│   │   ├── AcompanhamentoTerceiro.tsx
│   │   └── Lixeira.tsx
│   ├── forms/
│   │   ├── NovoChamado.tsx
│   │   ├── Triagem.tsx
│   │   ├── Encaminhamento.tsx
│   │   ├── ServicoTerceiroForm.tsx
│   │   └── AnexosInput.tsx
│   ├── feedback/ChamadoIndisponivel.tsx
│   ├── layout/Sidebar.tsx
│   └── ui/
│       ├── StatusBadge.tsx
│       ├── StatusServico.tsx
│       └── button.tsx
├── hooks/useChamado.ts
├── mocks/
│   ├── chamados.ts
│   ├── opcoes.ts
│   └── servicos.ts
├── services/api/README.md
├── store/
│   ├── ChamadosContext.tsx
│   └── chamadosReducer.ts
├── styles/
│   ├── globals.css
│   ├── tokens/brand.css
│   ├── base/global.css
│   └── layout/shell.css
├── types/chamado.ts
└── utils/
    ├── cn.ts
    └── date.ts
```

As rotas criadas são `/`, `/chamados/novo`, `/chamados/[id]`, `/chamados/[id]/triagem`, `/chamados/[id]/encaminhamento`, `/chamados/[id]/acompanhamento` e `/lixeira`. As páginas e o layout são Server Components de composição. Os componentes com formulários, estado e handlers são Client Components. Links usam `next/link`; navegação após exclusão e clique na linha da tabela usa `useRouter`. A Sidebar aparece uma vez no layout, determina o item ativo pelo pathname e exibe o contador compartilhado da lixeira.

Os componentes listados na árvore foram criados. `StatusBadge.tsx` exporta StatusBadge e PrioridadeBadge. `button.tsx` segue a composição shadcn/ui com Radix Slot, class-variance-authority e o utilitário cn; é usado no feedback de chamado indisponível e no controle compacto de anexos. Não havia componentes anteriores do ViaFlux. A marca, os ícones SVG e a composição visual da exportação foram reaproveitados e adaptados.

`types/chamado.ts` reúne Chamado, Status, Prioridade, StatusServico, TimelineItem, HistoricoItem, EventoTimeline, Anexo e ServicoTerceiro. `mocks/chamados.ts` contém os cinco chamados originais e o histórico inicial; `mocks/opcoes.ts` reúne parceiros, tipos de serviço, setores, responsáveis e gravidades demonstrativas; `mocks/servicos.ts` contém a timeline, os metadados e as previsões do parceiro original. Essas opções e SLAs permanecem exemplos de interface.

O Context usa um reducer para criação, atualização, envio à lixeira, restauração, exclusão definitiva, limpeza da lixeira, histórico, serviço terceirizado, observações e metadados de anexos. A sequência de IDs é independente da quantidade de chamados ativos, evitando reutilização após excluir. Histórico e serviço pertencem ao chamado e são mantidos durante a navegação, inclusive após restaurar. Observações do acompanhamento também aparecem na timeline dos detalhes. Formulários continuam com estado local; não existe controlador global de telas.

O index.css foi distribuído entre tokens, base e layout. As cinco cores recorrentes possuem tokens Tailwind e variáveis CSS. Inter e Montserrat são carregadas por next/font/google no layout. Permanecem bordas, radius, fundos, sombras, estados ativos e SVGs da referência. Foram adicionados foco visível, labels associados, aria-label em ações sem texto, estados de seleção e link para pular ao conteúdo. Em larguras pequenas, a Sidebar passa ao topo, grids se empilham e tabelas ganham rolagem horizontal dentro do próprio cartão.

App.tsx foi usado para extrair tipos, mocks e comportamento; não existe na aplicação final. main.tsx e vite-env.d.ts foram analisados e não utilizados. index.css foi adaptado, sem import externo de fontes. Nenhuma configuração, bootstrap ou router Vite foi incorporado. Vitest possui dependências internas de Vite apenas para os testes; dev e build executam Next.js. Não foram criados Route Handlers, endpoints artificiais, fetches ou proxy de autenticação sem finalidade.

Validação em 08/10/2026:

- `npm install`: concluído; package-lock.json gerado.
- `npm run lint`: aprovado sem erros ou warnings.
- `npm run typecheck`: aprovado; tipos de rotas gerados e TypeScript sem erros.
- `npm run build`: aprovado, com as sete rotas e saída standalone.
- `npm run test`: 10 testes de reducer e React Testing Library aprovados.
- `npm run test:e2e`: 4 testes Playwright aprovados no Chrome, cobrindo criação com anexo, triagem, encaminhamento, status, parceiro manual, observações, histórico, exclusão/restauração, filtros, confirmações, rotas diretas, recarregamento, ID inexistente e largura de 375 px.
- `npm run dev -- --hostname 127.0.0.1 --port 3101`: iniciado; Dashboard servido com HTTP 200 e os mocks presentes. A porta alternativa foi usada para a verificação local; o comando padrão continua usando 3000.
- Capturas das sete telas e das páginas móveis foram geradas em test-results/ para inspeção visual. O teste responsivo detectou e validou a correção de overflow no cartão do parceiro.

O build precisou de acesso à rede para baixar as fontes. A geração das páginas foi limitada a um processo em next.config.ts após esgotamento de memória. O disco também ficou sem espaço; a limpeza autorizada do cache de downloads npm, fora do repositório, permitiu concluir a validação. Nenhum código fora de apps/web foi alterado.

O primeiro `next dev` gerou automaticamente `apps/web/AGENTS.md` com a orientação para consultar a documentação instalada da versão Next.js. O arquivo foi preservado; não contém regras de aplicação, estado ou domínio.

Limitações conhecidas: o estado reinicia ao recarregar ou abrir outra sessão; anexos guardam apenas nome, tamanho e tipo em memória, sem envio ou armazenamento do conteúdo; autenticação e notificações reais não existem; imagens permanecem externas, como na referência; o cartão de localização é ilustrativo; SLA, previsões e eventos do parceiro são demonstrativos. As ações rápidas de solicitar atualização e cancelar serviço são simulações locais. A comparação visual foi feita com o código exportado e capturas da implementação; não foi fornecida uma referência independente em pixels do canvas original do Figma.
