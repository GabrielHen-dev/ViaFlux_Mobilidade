# Integração com a API

Cliente HTTP e contratos da API Spring Boot. A URL base vem de `NEXT_PUBLIC_API_URL` e, sem ela, usa `http://localhost:8281`.

- `cliente.ts`: `requisitarApi`, que monta a URL, envia JSON e converte respostas de erro (ProblemDetail) em `ErroApi`.
- `auth.ts`: login e renovação de sessão.

A autenticação já usa a API. Os chamados continuam vindo de `mocks/` e `store/` até que os endpoints correspondentes existam no backend. TanStack Query está disponível para essa próxima etapa.
