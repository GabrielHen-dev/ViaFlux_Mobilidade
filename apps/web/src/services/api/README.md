# Integração com a API

Cliente HTTP e contratos da API Spring Boot. A URL base vem de `NEXT_PUBLIC_API_URL` e, sem ela, usa `http://localhost:8281`.

- `cliente.ts`: `requisitarApi` e `requisitarArquivo`, que montam a URL, enviam JSON e convertem respostas de erro (ProblemDetail) em `ErroApi`.
- `transporte.ts`: o `fetch` usado pelo cliente.
- `auth.ts`: login e renovação de sessão.
- `contratos.ts`: corpos de requisição e filtros (abertura, triagem, status, transferência, métricas…).
- `chamados.ts`: chamados, triagem (`iniciarTriagem`, `concluirTriagem`), classificação, override, anexos e lixeira.
- `operacao.ts`: fornecedores, serviços terceirizados, notificações e métricas.
- `enderecos.ts`: CEP, endereço pelo GPS e busca de rua.
- `admin-usuarios.ts` e `devtools.ts`: gestão de usuários e dados de exemplo.

As funções de chamados, operação, endereços e dev tools recebem um `ClienteApi`, que o `AuthContext` fornece (`useApi`) com o token e a renovação automática. `auth.ts` e `admin-usuarios.ts` recebem o token diretamente. As telas usam essas funções pelos hooks de `src/hooks/consultas.ts`.
