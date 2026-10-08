# ViaFlux API — primeira entrega incremental

Fundação da API Java 21 / Spring Boot 3.5, PostgreSQL 16, Flyway e Actuator.

## Pré-requisitos

- JDK 21
- Docker + Docker Compose (PostgreSQL; usado também pelo Testcontainers)
- Git

## Executar no Windows (PowerShell)

Na raiz do repositório:

```powershell
Copy-Item infra/.env.example infra/.env
```

Edite `infra/.env` e defina `POSTGRES_PASSWORD` (não versionar este arquivo).
Inicie o banco:

```powershell
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

**Importante:** o Compose lê `infra/.env`, mas o processo Java iniciado pela IDE não recebe automaticamente essas variáveis.
Configure `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` na IDE, ou exporte-as no terminal:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/viaflux"
$env:SPRING_DATASOURCE_USERNAME="viaflux"
$env:SPRING_DATASOURCE_PASSWORD="<a senha definida em infra/.env>"
$env:SPRING_PROFILES_ACTIVE="dev"
cd apps/api
./mvnw.cmd spring-boot:run
```

Se alterou `POSTGRES_PORT` em `infra/.env`, ajuste a porta da URL JDBC acima.
No Linux/macOS use `./mvnw` e exporte as variáveis de ambiente do seu shell.

## Verificar

- Saúde: http://localhost:8080/health (esperado: `{"status":"UP"}`).
- Ao iniciar, o Flyway aplica `V1__initialize_schema.sql` uma vez.
- Testes: na pasta `apps/api`, execute `./mvnw.cmd test` (Windows) ou `./mvnw test` (Linux/macOS). Os testes usam PostgreSQL via Testcontainers e precisam do Docker disponível.
- Parar banco sem perder dados: `docker compose -f infra/docker-compose.yml down`.

Esta PR não implementa login/JWT, Swagger, entidades nem regras de negócio; isso será feito nas próximas PRs.
