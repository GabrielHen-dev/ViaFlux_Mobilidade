# Frontend ViaFlux Mobilidade

Aplicação Next.js 16 com App Router, React, TypeScript e Tailwind CSS 4. As sete telas seguem a exportação do Figma, adaptada para a organização do frontend do monorepo.

```powershell
cd apps/web
npm install
npm run dev
```

Abra http://localhost:3000. A aplicação começa com cinco chamados demonstrativos. Alterações ficam em memória durante a navegação; recarregar a página reinicia os mocks.

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

O estado temporário é implementado em `src/store/`, com Context e reducer. Tipos ficam em `src/types/`, dados fictícios em `src/mocks/` e a camada de integração futura em `src/services/api/`. Não existe comunicação com o backend. TanStack Query permanece disponível para essa integração; Zod valida o limite dos anexos.

Consulte [IMPLEMENTACAO.md](./IMPLEMENTACAO.md) para rotas, estrutura, validações e limitações.
