# Infraestrutura

Descrição dos ambientes e das variáveis. A justificativa da escolha está em [`../docs/stack.md`](../docs/stack.md#publicação-e-infraestrutura).

## Ambientes

| Arquivo | Ambiente | Serviços |
|---|---|---|
| `docker-compose.yml` | Desenvolvimento local | `db` (PostgreSQL) + `adminer` |
| `docker-compose.prod.yml` | Servidor do squad | `web` + `api` + `db` |

Em desenvolvimento, **só o banco sobe em contêiner**. Frontend e API rodam na máquina do integrante, com recarregamento rápido. Em produção, os três serviços sobem juntos pelo Compose: `web` e `api` publicam porta no host, e o `db` fica acessível apenas pela rede interna do Compose, sem alcance pela internet.

## Variáveis de ambiente

Copie o modelo e preencha:

```bash
cp infra/.env.example infra/.env
```

`infra/.env` está no `.gitignore` e **nunca** é versionado. Ao adicionar uma variável nova, registre o nome dela em `.env.example`, sem o valor, e documente aqui.

| Variável | Onde é usada | Descrição |
|---|---|---|
| `POSTGRES_DB` | Banco, API | Nome do banco. |
| `POSTGRES_USER` | Banco, API | Usuário do banco. |
| `POSTGRES_PASSWORD` | Banco, API | Senha do banco. **Obrigatória em produção**, sem valor padrão. |
| `POSTGRES_PORT` | Banco (dev) | Porta exposta no host em desenvolvimento. Altere se a 5432 já estiver ocupada na sua máquina. |
| `JWT_SECRET` | API | Chave de assinatura dos tokens. Precisa ter ao menos 32 bytes aleatórios; veja como gerar abaixo. |
| `JWT_ACCESS_TTL` | API | Validade do *access token*, em formato ISO-8601 de duração. `PT15M` são 15 minutos. |
| `JWT_REFRESH_TTL` | API | Validade do *refresh token*. `P7D` são 7 dias. |
| `WEB_PORT` | Compose (produção) | Porta do host que atende o frontend. Padrão `80`. |
| `API_PORT` | Compose (produção) | Porta do host que atende a API. Padrão `8080`. |
| `NEXT_PUBLIC_API_URL` | Frontend | URL da API vista pelo navegador. Em produção é o endereço do servidor com a `API_PORT`. |

> ⚠️ `NEXT_PUBLIC_*` é embutido no bundle do frontend e **fica visível para qualquer usuário**. Nunca coloque segredo nessa variável, porque ela existe só para endereço público.
>
> `NEXT_PUBLIC_API_URL` entra como argumento de build da imagem `web`. Mudar o valor no `.env` só tem efeito depois de reconstruir a imagem.

### Gerando o `JWT_SECRET`

```bash
openssl rand -base64 48
```

## Rodando em desenvolvimento

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

| Serviço | Endereço |
|---|---|
| PostgreSQL | `localhost:5432` |
| Adminer | <http://localhost:8081> |

> **Se a subida falhar com `port is already allocated`**, você já tem um PostgreSQL rodando na máquina. Não precisa desinstalar nada, só trocar a porta no seu `infra/.env`:
>
> ```
> POSTGRES_PORT=5433
> ```
>
> Depois ajuste `SPRING_DATASOURCE_URL` para a mesma porta ao rodar a API. Isso aconteceu na máquina do Tech Lead durante a validação do ambiente, então é provável que aconteça com mais alguém.

Para parar sem perder dados:

```bash
docker compose -f infra/docker-compose.yml down
```

O volume `db-data` sobrevive ao `down`. Para apagar o banco de propósito e começar do zero, use `down -v`.

## Rodando em produção

No servidor, a partir do diretório do repositório:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env up -d --build
```

É esse o comando que o deploy do GitHub Actions vai executar por SSH depois de um merge na `main`.

A ordem de subida é garantida pelos `healthcheck`: a `api` só inicia com o banco pronto, e a `web` só depois que a `api` responde em `/actuator/health`.

## Backup

O volume `backups` está montado no contêiner do banco para receber os dumps. Agende no servidor:

```bash
0 3 * * * docker exec viaflux-db pg_dump -U viaflux viaflux | gzip > /var/backups/viaflux-$(date +\%F).sql.gz
```

Duas coisas que o cron acima **não** faz e precisam ser resolvidas: copiar o dump para fora do servidor e apagar os antigos. Backup que só existe na máquina que pode falhar não é backup. O volume `anexos` precisa do mesmo tratamento, porque os arquivos não estão no dump.

## Pendências antes do primeiro deploy

| Item | Situação |
|---|---|
| `.github/workflows/deploy.yml` | A criar depois de confirmar se o servidor aceita SSH de entrada |
| `spring-boot-starter-actuator` | Necessário para o `healthcheck` do serviço `api` responder em `/actuator/health` |
| Servidor e endereço público | A confirmar. Enquanto não houver TLS, a aplicação responde em HTTP |
| Rotina de backup fora do servidor | A definir junto com o destino dos dumps e dos anexos |
