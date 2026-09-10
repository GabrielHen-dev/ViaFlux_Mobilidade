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

O atendimento passa por sete áreas: atendimento nas unidades, assistência, manutenção, tecnologia, financeiro, logística e contratos. Quatro delas aparecem nos relatos como destino de chamado e são as que o produto trata como **áreas atendentes** nesta fase: tecnologia, assistência, manutenção e financeiro. Logística e contratos estão no organograma, mas ninguém confirmou se recebem chamado direto ou só apoiam.

Hoje as solicitações chegam por telefone, WhatsApp e e-mail, e algumas equipes mantêm planilhas próprias. Não existe um controle único entre essas áreas. Daí vêm os problemas que este projeto ataca:

- **Não existe identificador único de chamado.** O mesmo problema é relatado por várias pessoas em canais diferentes, e ninguém sabe quantos casos estão realmente abertos.
- **A informação se perde no repasse.** Quando um chamado é transferido, os dados não vão com ele, então o cliente repete o que já disse e reenvia fotos e documentos.
- **Um caso atravessa várias áreas.** Começa na unidade, passa pela assistência, envolve uma oficina externa e termina no financeiro, sem histórico contínuo.
- **A troca de turno interrompe o acompanhamento**, porque parte dos casos precisa continuar viva entre plantões.
- **O fornecedor externo é um ponto cego.** Depois de encaminhar para uma oficina, guincho ou prestador, a empresa não consegue acompanhar o que acontece.
- **Tudo é urgente.** Sem critério de impacto, a liderança não consegue dizer quantos clientes estão afetados nem quem está atuando em cada caso.

> Numa noite de sexta-feira, um motorista ficou parado na estrada e o prestador de assistência recebeu o pedido sem a localização completa. O motorista foi transferido entre atendentes e repetiu seus dados três vezes. Ao mesmo tempo, um gestor corporativo classificava como crítica uma dúvida de cobrança, e uma unidade de aeroporto perdia o acesso ao sistema de entrega de veículos. Ninguém sabia qual dos três casos afetava mais clientes, e a causa raiz só apareceu no dia seguinte.

## Objetivo do produto

Centralizar o ciclo de vida do chamado, do registro ao encerramento. Nada aqui é compromisso de entrega fechado; a coluna **Fase** marca o recorte do MVP.

| # | Objetivo | Fase |
|:-:|---|:---:|
| 1 | Canal único de abertura, para a unidade não precisar saber de antemão qual área vai atender | MVP |
| 2 | Registro em nome do cliente pelo atendente, para o que chega por telefone, WhatsApp ou e-mail | MVP |
| 3 | Identificador único e rastreável por solicitação, para acabar com chamados duplicados | MVP |
| 4 | Histórico completo e contínuo por chamado, preservado na troca de turno e visível a todos os envolvidos | MVP |
| 5 | Anexos no contexto do caso: fotos, documentos, placas, contratos e localização | MVP |
| 6 | Priorização por impacto real, e não pela urgência que o solicitante declarou | MVP |
| 7 | Roteamento para a área responsável, com transferência que leva o histórico junto | MVP |
| 8 | Controle de acesso por perfil: unidades, áreas internas, fornecedores e clientes corporativos | MVP |
| 9 | Módulo de parceiros terceirizados, para a oficina e o guincho atualizarem status | Depois |
| 10 | Indicadores para a liderança: volume por unidade, problemas recorrentes, tempo de atendimento e impacto operacional | Depois |
| 11 | Retorno proativo ao cliente sobre o andamento do próprio chamado | Depois |
| 12 | Pesquisa de satisfação pós-atendimento | Depois |

O objetivo 6 depende de o cliente definir o que conta como impacto, e o 9 depende de como o parceiro acessa a plataforma. Os dois estão em [Em aberto com o cliente](#em-aberto-com-o-cliente).

**Controle de SLA não é objetivo desta fase.** Ele aparece em [`docs/stack.md`](docs/stack.md#backend) como regra prevista, mas está bloqueado pela pendência descrita em [O que o produto não resolve](#o-que-o-produto-não-resolve). Até lá a plataforma registra os tempos, sem cobrar prazo.

### Premissas

1. **Operação 24/7**, com acesso por navegador nas unidades e por celular nas equipes de campo e na assistência. Parte dos usuários está em deslocamento com conexão instável no celular pessoal — como tratar isso ainda é decisão em aberto, registrada como risco em [`docs/stack.md`](docs/stack.md#principais-riscos).
2. Os canais atuais continuam existindo em paralelo durante a transição. A plataforma é o ponto único de **registro**, não de contato: ela é alimentada tanto pela abertura direta do cliente quanto pelo atendente que recebeu a solicitação por telefone.
3. Usuários externos não dependem de conta no domínio corporativo da ViaFlux.
4. O acesso a dados pessoais e contratuais fica restrito às partes diretamente envolvidas no chamado, seguindo a LGPD, sem deixar o atendente sem a informação de que precisa para continuar o caso. Retenção e exclusão ainda não foram definidas.

## Quem usa

| Perfil | Necessidade principal | Condição de acesso |
|---|---|---|
| Motoristas e clientes PF | Suporte rápido em emergência, retirada e devolução | Celular pessoal, conexão instável |
| Gestores de frota corporativa | Relatórios, previsibilidade, prioridade | Computador corporativo |
| Fornecedores terceirizados | Receber e atualizar ordem de serviço | Sistemas próprios, sem conta corporativa ViaFlux |
| Atendentes das unidades | Abrir e acompanhar chamado, inclusive o que chegou por telefone | Computador corporativo, horário comercial |
| Central de assistência 24h | Atendimento emergencial contínuo | Desktop e celular, regime de turnos |
| Tecnologia, manutenção e financeiro | Atuação em segunda camada quando acionados | Computador corporativo, horário comercial |
| Liderança operacional | Visão consolidada de volume, criticidade e status | Computador e celular |

Logística e contratos ainda não têm perfil, pela pendência descrita no contexto. Os perfis técnicos correspondentes estão em [`docs/stack.md`](docs/stack.md#autenticação-e-permissões).

## O que o produto não resolve

Nem todo problema levantado se resolve com software. Estes dependem de decisão e de gestão da ViaFlux, e a plataforma não substitui nenhum deles:

- **Divergência de escopo entre áreas.** Cada departamento tem uma leitura diferente do que deve atender. Exige acordo organizacional, tipo RACI, não uma feature.
- **Política de SLA.** Não existem tempos-alvo formalizados. Automatizar SLA antes disso é automatizar o vazio.
- **Quem comunica o cliente quando o chamado está com um terceiro.** Hoje ninguém assume. É governança.
- **Adesão dos parceiros.** O objetivo 9 depende de a oficina e o guincho realmente atualizarem status. Isso é cláusula contratual; sem ela a funcionalidade existe e fica vazia.
- **Cultura de planilhas paralelas.** Substituir a planilha é simples; fazer a equipe abandoná-la depende de treinamento e diretriz da liderança.
- **Nível de acesso dos externos.** Definir quem vê o quê é decisão de política e compliance, não de configuração.

## Como vamos medir o resultado

Nenhuma linha de base foi medida ainda. Como o cenário atual está espalhado em planilhas sem integração, os valores de partida precisam ser levantados antes da implantação — sem isso não há comparação depois.

| Critério | Linha de base | Como verificar |
|---|---|---|
| Repetição de informação pelo cliente | A levantar. O caso da sexta-feira teve 3 repetições, mas é relato isolado, não média apurada | Meta de coleta única por chamado, por amostragem de chamados transferidos |
| Tempo médio de resolução | A levantar por tipo de chamado, a partir das planilhas | Comparar antes e depois da implantação |
| Chamados com rastreabilidade completa | Zero, por ausência de sistema | % com registro em abertura, triagem, execução e fechamento |
| Chamados duplicados identificados | A levantar | % apontado como duplicata sobre o total aberto |
| Chamados com terceiros e status atualizado | Zero, por ausência de sistema | % dos encaminhados cujo parceiro atualizou o status |
| Acurácia da triagem | A levantar | % que chegou ao setor correto na primeira tentativa |
| Satisfação do cliente | Não existe pesquisa hoje | Depende do objetivo 12; sem ele o critério não é aferível |

## Em aberto com o cliente

| Pergunta | Trava o quê |
|---|---|
| Logística e contratos recebem chamado direto, ou só apoiam? | Áreas atendentes e perfis de acesso |
| O que conta como impacto real: clientes afetados, veículo parado em via, unidade indisponível? Qual a ordem? | Objetivo 6, o motor de triagem |
| Como o parceiro acessa sem conta corporativa: link por chamado, convite, credencial? | Objetivo 9 e a premissa 3 |
| Por qual meio o cliente é notificado: e-mail, SMS, WhatsApp? Há contrato com provedor? | Objetivo 11 e o custo de infraestrutura |
| Qual o prazo de retenção de dados e anexos, e como se dá a exclusão a pedido do titular? | Premissa 4 e conformidade com a LGPD |
| Existe histórico consultável nas planilhas para levantar as linhas de base? | Todos os critérios de resultado |
| Quem assume a comunicação com o cliente quando o chamado está com um terceiro? | Decisão de governança acima |

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

A árvore abaixo é a estrutura alvo. O que ainda **não** está no repositório está marcado com `‹a criar›`, e entra com a primeira entrega de código.

```
ViaFlux_Mobilidade/
├── .github/                              ‹a criar›
│   ├── ISSUE_TEMPLATE/         Modelos de issue (bug e feature)
│   ├── pull_request_template.md
│   └── workflows/ci.yml        Build e testes de web e api em cada PR
├── apps/
│   ├── web/                    Frontend Next.js
│   │   ├── Dockerfile          Build multi-stage, saída standalone
│   │   ├── package.json                  ‹a criar›
│   │   ├── src/app/            Rotas (App Router)               ‹a criar›
│   │   ├── src/components/ui/  Componentes de interface (shadcn/ui)  ‹a criar›
│   │   ├── src/features/       Código por domínio (chamados, auth, ...) ‹a criar›
│   │   ├── src/lib/            Cliente HTTP, sessão, utilitários ‹a criar›
│   │   └── tests/              Vitest e Playwright              ‹a criar›
│   └── api/                    Backend Spring Boot
│       ├── Dockerfile          Build com Maven, JAR sobre Temurin 21 JRE
│       ├── pom.xml                       ‹a criar›
│       ├── mvnw + .mvn/                  ‹a criar›
│       └── src/main/                     ‹a criar›
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
│   ├── docker-compose.yml      Desenvolvimento: PostgreSQL e Adminer  ‹a criar›
│   ├── docker-compose.prod.yml Produção: web, api e banco
│   ├── .env.example            Variáveis necessárias, sem valores reais
│   └── README.md               Ambientes, variáveis e deploy
└── README.md
```

## Como rodar localmente

> **Estado atual.** O repositório contém, por enquanto, a documentação, os `Dockerfile` das duas aplicações e o Compose de produção. O código de `web` e `api`, o `infra/docker-compose.yml` de desenvolvimento e o `.github/` entram na primeira entrega de código. **Os passos abaixo são o procedimento acordado e só funcionam a partir dela** — hoje eles falham por falta de `pom.xml` e de `package.json`.

### Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 22 LTS ou superior | |
| JDK | 21 (LTS) | O `pom.xml` vai exigir a 21. Quem tem JDK 17 precisa atualizar: [Temurin 21](https://adoptium.net/temurin/releases/?version=21) |
| Docker e Docker Compose | qualquer versão recente | Usado pelo banco e pelos testes com Testcontainers |
| Git | 2.40 ou superior | |

Não vai precisar instalar o Maven: o projeto usa o Maven Wrapper (`./mvnw`), que baixa a versão certa na primeira execução e será commitado junto com o `pom.xml`.

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

Vale lembrar o recorte da entrega: quando o código subir, as duas aplicações compilam e sobem, mas ainda sem telas nem endpoints de negócio — o frontend serve uma página só e a API sobe sem entidade nem controller. O que vale a partir de agora é a estrutura, a configuração, o build e a documentação.

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

Os modelos de issue e de pull request ficam em `.github/`, com o checklist do que cada entrega precisa conter. Ainda não foram criados — entram junto com o workflow de CI.
