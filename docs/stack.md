# Stack e integração contínua — ViaFlux

## Stack

- Web: Next.js 16, TypeScript, Node.js 22, Vitest e ESLint.
- API: Java 21, Spring Boot, Maven, JUnit 5 e Testcontainers.
- Banco: PostgreSQL 16 (imagem `postgres:16-alpine` nos testes de integração).
- CI: GitHub Actions, em `.github/workflows/ci.yml`.

## Integração contínua

A CI é acionada em pull requests e pushes para `main` e `dev`, além de execução manual.

- **Web - lint, tipos, Vitest e build**: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` em `apps/web`.
- **API - Maven verify (PostgreSQL 16)**: `./mvnw -B -ntp verify` em `apps/api`. Os testes de integração existentes utilizam Testcontainers e PostgreSQL 16. O runner Ubuntu do GitHub Actions precisa ter Docker disponível.
- **Web - Docker build**: valida a construção da imagem Docker do frontend após o job Web.

O Playwright e2e permanece opcional e não integra a CI obrigatória nesta etapa.

## Proteção das branches (configuração manual no GitHub)

Em Settings > Rules > Rulesets (ou Branch protection rules), configurar `main` e `dev` para exigir pull request, pelo menos uma aprovação e os checks obrigatórios **Web - lint, tipos, Vitest e build**, **API - Maven verify (PostgreSQL 16)** e **Web - Docker build**. Confirmar os nomes dos checks após a primeira execução e impedir bypass não autorizado. A configuração de proteção não é aplicada apenas por adicionar o YAML ao repositório.

## Verificação de aceite

1. Abrir PR para `dev` e confirmar execução dos três jobs.
2. Confirmar que testes da API executam com PostgreSQL 16 (não apenas testes unitários).
3. Provocar falha controlada em uma branch de teste e confirmar que o check fica vermelho e bloqueia o merge.
4. Repetir a verificação para `main`.

O baseline de prioridade e SLA operacional P1–P4 integra o MVP conforme a documentação de domínio e SLA. Funcionalidades avançadas de predição de SLA e relatórios analíticos avançados permanecem fora do MVP; não confundir esses itens com os prazos e indicadores operacionais já aprovados.
