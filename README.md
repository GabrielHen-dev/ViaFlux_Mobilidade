# ViaFlux_Mobilidade
=======
<h1 align="center">ViaFlux Mobilidade</h1>
<p align="center"><strong>Plataforma de Gerenciamento de Chamados</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 7"/>
  <img src="https://img.shields.io/badge/Java-21_LTS-ED8B00?style=flat-square&logo=openjdk&logoColor=white" alt="Java 21"/>
  <img src="https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot 3.5"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose"/>
</p>

<p align="center">
  Projeto da <strong>Residência de Software Avanade 2026.2</strong>, CESAR School, Squad 03
</p>

---

## Contexto

A ViaFlux Mobilidade é uma empresa fictícia que aluga veículos para pessoas físicas e cuida da frota de empresas. Tem 30 unidades de atendimento espalhadas por centros urbanos, rodoviárias e aeroportos, cerca de 1.800 veículos e uma rede externa de oficinas, guinchos, seguradoras e prestadores de assistência. A central de assistência funciona 24 horas; as outras áreas, não.

Hoje as solicitações chegam por telefone, WhatsApp e e-mail, e algumas equipes mantêm planilhas próprias. Não existe um controle único entre tecnologia, assistência, manutenção e financeiro. Daí vêm os problemas que este projeto ataca:

- **Não existe identificador único de chamado.** O mesmo problema é relatado por várias pessoas em canais diferentes, e ninguém sabe quantos casos estão realmente abertos.
- **A informação se perde no repasse.** Quando um chamado é transferido, os dados não vão com ele, então o cliente repete o que já disse e reenvia fotos e documentos.
- **Um caso atravessa várias áreas.** Começa na unidade, passa pela assistência, envolve uma oficina externa e termina no financeiro, sem histórico contínuo.
- **A troca de turno interrompe o acompanhamento**, porque parte dos casos precisa continuar viva entre plantões.
- **O fornecedor externo é um ponto cego.** Depois de encaminhar para uma oficina, guincho ou prestador, a empresa não consegue acompanhar o que acontece.
- **Tudo é urgente.** Sem critério de impacto, a liderança não consegue dizer quantos clientes estão afetados nem quem está atuando em cada caso.

> Numa noite de sexta-feira, um motorista ficou parado na estrada e o prestador de assistência recebeu o pedido sem a localização completa. O motorista foi transferido entre atendentes e repetiu seus dados três vezes. Ao mesmo tempo, uma unidade de aeroporto perdia o acesso ao sistema de entrega de veículos, e ninguém sabia qual dos dois casos afetava mais clientes.

## Objetivo do produto

Centralizar o ciclo de vida do chamado, do registro ao encerramento:

| # | Objetivo |
|:-:|---|
| 1 | Canal único de abertura, para a unidade não precisar saber de antemão qual área vai atender |
| 2 | Identificador único e rastreável por solicitação, para acabar com chamados duplicados |
| 3 | Roteamento para a área responsável (tecnologia, assistência, manutenção, financeiro), com transferência que leva o histórico junto |
| 4 | Histórico completo e contínuo por chamado, preservado na troca de turno e visível a todos os envolvidos |
| 5 | Anexos no contexto do caso: fotos, documentos, placas, contratos e localização |
| 6 | Priorização por impacto real, e não pela urgência que o solicitante declarou |
| 7 | Acompanhamento por perfil, incluindo unidades, áreas internas, fornecedores e clientes corporativos |
| 8 | Indicadores para a liderança: volume por unidade, problemas recorrentes, tempo de atendimento e impacto operacional |

Três restrições valem desde o início: a operação é 24/7, parte dos usuários está em deslocamento com conexão instável no celular pessoal, e é preciso proteger dados pessoais e contratuais (LGPD) sem deixar o atendente sem a informação de que precisa para continuar o caso.

## Membros da Equipe

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/GabrielHen-dev">
        <img src="https://avatars.githubusercontent.com/u/113862540?v=4" width="100" style="border-radius:50%;" alt="Foto de Gabriel Henrique"/>
        <br />
        <sub><b>Gabriel Henrique</b></sub>
      </a>
      <br />
      <sub>Tech Lead</sub>
    </td>
    <td align="center">
      <a href="https://github.com/dgcavalcante">
        <img src="https://avatars.githubusercontent.com/u/210120655?v=4" width="100" style="border-radius:50%;" alt="Foto de Diogo Cavalcante"/>
        <br />
        <sub><b>Diogo Cavalcante</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/lucaschavessf">
        <img src="https://avatars.githubusercontent.com/u/153633041?v=4" width="100" style="border-radius:50%;" alt="Foto de Lucas Chaves"/>
        <br />
        <sub><b>Lucas Chaves</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/allyssonifx">
        <img src="https://avatars.githubusercontent.com/u/68469620?v=4" width="100" style="border-radius:50%;" alt="Foto de Allysson Fellype"/>
        <br />
        <sub><b>Allysson Fellype</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Fernando2732">
        <img src="https://avatars.githubusercontent.com/u/209713382?v=4" width="100" style="border-radius:50%;" alt="Foto de Fernando Marinho"/>
        <br />
        <sub><b>Fernando Marinho</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/MatheusAS1">
        <img src="https://avatars.githubusercontent.com/u/210196636?v=4" width="100" style="border-radius:50%;" alt="Foto de Matheus Andrade"/>
        <br />
        <sub><b>Matheus Andrade</b></sub>
      </a>
    </td>
  </tr>
</table>

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zod | Base que o squad já domina, e SSR com layout mobile-first atende quem abre chamado do celular na estrada |
| Backend | Java 21 LTS, Spring Boot 3.5, Maven, Spring Data JPA, Bean Validation, Flyway, springdoc-openapi | Segunda base do squad. Tipagem e transações protegem um domínio cheio de regra, como SLA, transferência e histórico |
| Banco | PostgreSQL 16 | Chamado, responsável e histórico são relacionais, e o `JSONB` absorve os campos que variam por tipo de solicitação |
| Autenticação | Spring Security com JWT próprio (access e refresh), BCrypt | Custo zero, nada extra para subir, e permissão guardada em tabela, já que o cliente ainda não definiu o acesso dos usuários externos |
| Testes | JUnit 5, Mockito e Testcontainers na API; Vitest, React Testing Library e Playwright na web | Cobre regra de negócio e os fluxos críticos ponta a ponta, sem perseguir percentual de cobertura |
| Publicação | Docker Compose em servidor próprio, GitHub Actions | Custo zero, sem limite de free tier, e ambiente igual ao de desenvolvimento |

As justificativas completas, e os riscos que cada escolha carrega, estão em [`docs/stack.md`](docs/stack.md).

## Estrutura do repositório

Este é um monorepo. Frontend, backend, infraestrutura e documentação ficam no mesmo repositório e são versionados juntos.

```
ViaFlux_Mobilidade/
├── .github/
│   ├── ISSUE_TEMPLATE/         Modelos de issue (bug e feature)
│   ├── pull_request_template.md
│   └── workflows/ci.yml        Build e testes de web e api em cada PR
├── apps/
│   ├── web/                    Frontend Next.js
│   │   ├── Dockerfile          Build multi-stage, saída standalone
│   │   ├── src/app/            Rotas (App Router)
│   │   ├── src/components/ui/  Componentes de interface (shadcn/ui)
│   │   ├── src/features/       Código por domínio (chamados, auth, ...)
│   │   ├── src/lib/            Cliente HTTP, sessão, utilitários
│   │   └── tests/              Vitest e Playwright
│   └── api/                    Backend Spring Boot
│       ├── Dockerfile          Build com Maven, JAR sobre Temurin 21 JRE
│       ├── pom.xml
│       └── src/main/
│           ├── java/br/com/viaflux/api/
│           │   ├── chamado/    Núcleo do domínio
│           │   ├── usuario/    Usuários, perfis e permissões
│           │   ├── auth/       Login, JWT e refresh
│           │   ├── anexo/      Fotos, documentos e contratos
│           │   └── shared/     Configuração e tratamento de erro
│           └── resources/
│               ├── application.yml
│               └── db/migration/   Migrações Flyway
├── docs/
│   └── stack.md                Decisão de stack, justificativas e riscos
├── infra/
│   ├── docker-compose.yml      Desenvolvimento: PostgreSQL e Adminer
│   ├── docker-compose.prod.yml Produção: web, api e banco
│   ├── .env.example            Variáveis necessárias, sem valores reais
│   └── README.md               Ambientes, variáveis e deploy
└── README.md
```

## Como rodar localmente

### Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 22 LTS ou superior | |
| JDK | 21 (LTS) | O `pom.xml` exige a 21. Quem tem JDK 17 precisa atualizar: [Temurin 21](https://adoptium.net/temurin/releases/?version=21) |
| Docker e Docker Compose | qualquer versão recente | Usado pelo banco e pelos testes com Testcontainers |
| Git | 2.40 ou superior | |

Não precisa instalar o Maven. O repositório já inclui o Maven Wrapper (`./mvnw`), que baixa a versão certa na primeira execução.

### 1. Clonar e configurar

```bash
git clone https://github.com/GabrielHen-dev/ViaFlux_Mobilidade.git
cd ViaFlux_Mobilidade
cp infra/.env.example infra/.env
```

Abra o `infra/.env` e preencha os valores. Esse arquivo nunca é versionado.

### 2. Subir o banco

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

O PostgreSQL fica em `localhost:5432`, e o Adminer, para olhar os dados pelo navegador, em <http://localhost:8081>.

Se der erro de porta já em uso, você já tem um PostgreSQL rodando na máquina. É só trocar a porta no `.env`, como explicado em [`infra/README.md`](infra/README.md).

### 3. Subir a API

```bash
cd apps/api && ./mvnw spring-boot:run
```

A API sobe em <http://localhost:8080> e a documentação OpenAPI em <http://localhost:8080/swagger-ui.html>. Suba o banco antes, porque o Flyway e o JPA validam a conexão na inicialização.

### 4. Subir o frontend

```bash
cd apps/web && npm install && npm run dev
```

A aplicação fica em <http://localhost:3000>.

> **Estado atual.** Esta é a entrega de preparação de ambiente, não de funcionalidade. As duas aplicações compilam e sobem, mas ainda não têm telas nem endpoints de negócio: o frontend serve uma página só e a API sobe sem entidade nem controller. O que já está pronto e vale a partir de agora é a estrutura, a configuração, o build e a documentação.

## Publicação

Em produção os três serviços sobem juntos pelo Compose, no servidor do squad:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env up -d --build
```

Os ambientes, as variáveis, a rotina de backup e as pendências do primeiro deploy estão em [`infra/README.md`](infra/README.md).

## Convenções de colaboração

- Branches saem de `main` e seguem o padrão `<tipo>/<issue>-<descricao>`, como `feat/12-abrir-chamado`.
- Commits seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) com escopo: `feat(api): criar endpoint de abertura de chamado`. Os tipos em uso são `feat`, `fix`, `docs`, `refactor`, `test` e `chore`.
- Pull requests precisam de 1 aprovação e CI verde, e entram por *squash merge*.
- Alteração de banco entra como nova migração Flyway. Migração já aplicada não se edita.
- Variável de ambiente nova é registrada em `infra/.env.example` e documentada em `infra/README.md`.
- A `main` é protegida e deve estar sempre publicável.

Os modelos de issue e de pull request em [`.github/`](.github/) já trazem o checklist do que cada entrega precisa conter.
