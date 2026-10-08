# Frontend ViaFlux Mobilidade

Aplicação Next.js 16 com App Router, React, TypeScript e Tailwind CSS 4. As sete telas seguem a exportação do Figma, adaptada para a organização do frontend do monorepo.

```powershell
cd apps/web
npm install
npm run dev
```

Abra http://localhost:5261. Todas as telas exigem login, então a API precisa estar em execução; veja [`infra/README.md`](../../infra/README.md#rodando-em-desenvolvimento). Entre com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD` definidos em `infra/.env`.

A API é procurada em `http://localhost:8281`. Para usar outro endereço, crie `apps/web/.env.local` com `NEXT_PUBLIC_API_URL`.

Depois do login, a aplicação começa com cinco chamados demonstrativos. Alterações nos chamados ficam em memória durante a navegação; recarregar a página reinicia os mocks, mas mantém a sessão.

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

O estado temporário é implementado em `src/store/`, com Context e reducer. Tipos ficam em `src/types/`, dados fictícios em `src/mocks/` e a integração com a API em `src/services/api/`. Hoje só a autenticação usa o backend; a sessão fica em `src/store/AuthContext.tsx`, e as rotas protegidas estão no grupo `src/app/(central)/`. TanStack Query permanece disponível para essa integração; Zod valida o limite dos anexos.

Consulte [IMPLEMENTACAO.md](./IMPLEMENTACAO.md) para rotas, estrutura, validações e limitações.
