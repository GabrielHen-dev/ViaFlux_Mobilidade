# Stack e decisões técnicas

A stack foi definida pensando no que o squad já conhece, na facilidade de manutenção e nas necessidades reais da plataforma. A ideia é evitar complexidade desnecessária e, ao mesmo tempo, garantir segurança, integração e uma boa experiência para os usuários.

## Organização do projeto

Foi escolhido o modelo de **monorepo**, mantendo frontend, backend, infraestrutura e documentação no mesmo repositório. Isso facilita alterações que envolvem mais de uma parte do sistema, já que tudo pode ser revisado em um único lugar.

## Frontend

**Next.js 16**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **TanStack Query**, **React Hook Form** e **Zod**.

A escolha aproveita a experiência do squad com React e TypeScript e facilita a criação de uma interface responsiva, principalmente para quem acessa o sistema pelo celular e pode estar em local com conexão instável.

O Next.js ajuda na organização e no carregamento da aplicação. O TanStack Query cuida do consumo e do cache dos dados da API, enquanto React Hook Form e Zod mantêm formulários e validações organizados.

## Backend

**Java 21**, **Spring Boot 3.5**, **Maven**, **Spring Data JPA**, **Spring Security**, **Bean Validation**, **Flyway** e **springdoc-openapi**.

Java com Spring já faz parte da experiência do squad e oferece uma estrutura adequada para um sistema com bastante regra de negócio: cálculo de prioridade, transferência de chamados entre áreas, preservação do histórico, controle de SLA e validação de mudanças de status.

A tipagem forte, a organização em camadas e o uso de transações ajudam a manter essas informações consistentes. O Flyway controla as alterações do banco de forma organizada e garante que todos os ambientes usem a mesma estrutura.

## Banco de dados

**PostgreSQL 16**, com migrações versionadas pelo Flyway.

O banco atende bem ao cenário porque o sistema tem várias relações entre chamados, unidades, áreas, responsáveis, histórico, fornecedores e SLA. Dois recursos pesam na escolha: **JSONB**, para armazenar os campos que variam conforme o tipo de solicitação, e **busca textual**, para consultar o histórico.

Os anexos (fotos, documentos e contratos) ficam armazenados fora do banco. O banco guarda apenas as informações necessárias para localizar e controlar esses arquivos.

## Autenticação e permissões

A autenticação usa **Spring Security com JWT** (access e refresh), e **BCrypt** para proteger as senhas.

As permissões ficam em tabelas, separando usuários, perfis e permissões. Assim os níveis de acesso podem ser ajustados sem espalhar regra pelo código, o que importa porque o cliente ainda não definiu o acesso dos usuários externos. Os perfis previstos são `ADMIN`, `ATENDENTE_UNIDADE`, `TECNOLOGIA`, `ASSISTENCIA`, `MANUTENCAO`, `FINANCEIRO`, `FORNECEDOR`, `CLIENTE_CORPORATIVO` e `MOTORISTA`.

Cada usuário enxerga somente os chamados aos quais tem acesso, e os anexos seguem a mesma regra de autorização, para que nenhum arquivo seja acessado direto pela URL. A estrutura também deixa aberta uma futura integração com login corporativo, como OIDC/Keycloak.

## Testes

Na API: **JUnit 5**, **Mockito**, **MockMvc** e **Testcontainers** com PostgreSQL real. No frontend: **Vitest**, **React Testing Library** e **Playwright**.

O foco é testar as regras e os fluxos mais importantes, sem perseguir percentual de cobertura:

- cálculo de prioridade;
- transferência de chamados mantendo o histórico;
- controle de SLA;
- validação das mudanças de status;
- controle de acesso entre perfis;
- abertura de chamados com anexos.

## Publicação e infraestrutura

A aplicação é publicada com **Docker Compose** em **servidor próprio**, e o **GitHub Actions** cuida do build e do deploy.

Cada parte roda como um serviço do Compose: frontend, backend e banco. O mesmo arquivo descreve o ambiente inteiro, o que mantém desenvolvimento e produção parecidos e deixa o custo em zero, sem limite de free tier.

Como o servidor é próprio, disponibilidade, backups, atualizações e segurança da infraestrutura ficam com o squad. Para reduzir esse risco, o Compose já prevê `healthcheck` nos serviços, reinicialização automática, volumes persistentes, backup do banco e dos anexos, e variáveis de ambiente fora do versionamento.

Os detalhes de cada ambiente e de cada variável estão em [`infra/README.md`](../infra/README.md).

## Principais riscos

| Risco | Como a proposta reduz |
|---|---|
| Complexidade do Spring Security | Permissões em tabela, ajustáveis sem mexer no código |
| Mudanças no modelo de chamados | Campos variáveis em JSONB e alterações de banco pelo Flyway |
| Alterações nas permissões dos usuários | Perfis e permissões em banco, não em enum fixo |
| Responsabilidade sobre o servidor próprio | Healthcheck, restart automático, volumes e rotina de backup |
| Diferenças entre Server e Client Components no Next.js | Convenção definida antes das primeiras telas |
