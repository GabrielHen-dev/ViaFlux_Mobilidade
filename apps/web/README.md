# Frontend ViaFlux Mobilidade

Aplicação Next.js 16 com App Router, React, TypeScript e Tailwind CSS 4. As sete telas seguem a exportação do Figma, adaptada para a organização do frontend do monorepo.

```powershell
cd apps/web
npm install
npm run dev
```

Abra http://localhost:5261. Todas as telas exigem login, então a API precisa estar em execução; veja [`infra/README.md`](../../infra/README.md#rodando-em-desenvolvimento). Entre com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD` definidos em `infra/.env`.

A API é procurada em `http://localhost:8281`. Para usar outro endereço, crie `apps/web/.env.local` com `NEXT_PUBLIC_API_URL`.

Todos os dados vêm da API; não há mais simulação no navegador. Para popular o banco com usuários, organizações e chamados de exemplo (parte deles na fila de triagem), habilite `DEV_TOOLS_HABILITADO` na API e use a tela `/dev-tools` como admin.

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright inicia um servidor de produção na porta 3100, portanto execute `build` antes dos testes de navegador. Para usar o Chrome já instalado no Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
```

O Dockerfile existente publica a saída standalone. O build baixa Inter e Montserrat via `next/font/google`; a aplicação entrega essas fontes localmente depois da compilação. As imagens demonstrativas mantêm os endereços Unsplash da referência.

A sessão fica em `src/store/AuthContext.tsx` e as rotas protegidas no grupo `src/app/(central)/`. As telas buscam dados pelos hooks de `src/hooks/consultas.ts` (TanStack Query), que usam as funções de `src/services/api/`; nenhuma tela chama `fetch` direto. O ciclo do chamado e a triagem estão em [`docs/fluxo-de-chamados.md`](../../docs/fluxo-de-chamados.md).

Consulte [IMPLEMENTACAO.md](./IMPLEMENTACAO.md) para rotas, estrutura, validações e limitações.
