# Infraestrutura

Descrição dos ambientes e das variáveis. A justificativa da escolha está em [`../docs/stack.md`](../docs/stack.md#publicação-e-infraestrutura).

## Ambientes

| Arquivo | Ambiente | Serviços | Situação |
|---|---|---|---|
| `docker-compose.yml` | Desenvolvimento local | `db` (PostgreSQL) + `adminer` | No repositório |
| `docker-compose.prod.yml` | Produção no Dokploy | `web` + `api` + `db` | No repositório |

Em desenvolvimento, PostgreSQL e Adminer sobem em contêiner. Frontend e API rodam na máquina do integrante, com recarregamento rápido. As portas do banco e do Adminer ficam vinculadas ao loopback. Em produção, os três serviços sobem juntos pelo Compose no Dokploy. `web` e `api` recebem tráfego pelo Traefik do Dokploy, através dos domínios configurados no painel, e também ficam publicadas no host nas portas 5261 e 8281; o `db` fica acessível apenas pela rede interna do Compose, sem alcance pela internet.

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
| `POSTGRES_PASSWORD` | Banco, API | Senha do banco. **Obrigatória para executar o Compose e a API**, sem valor padrão. |
| `POSTGRES_PORT` | Banco e API | Porta exposta no host em desenvolvimento e usada pela API para conectar ao banco. Altere se a 5432 já estiver ocupada na sua máquina. |
| `JWT_SECRET` | API | Chave de assinatura dos tokens. **Obrigatória**: a API não sobe sem ela. Precisa ter ao menos 32 bytes aleatórios; veja como gerar abaixo. |
| `JWT_ACCESS_TTL` | API | Validade do *access token*, em formato ISO-8601 de duração. `PT15M` são 15 minutos. |
| `JWT_REFRESH_TTL` | API | Validade do *refresh token*. `P7D` são 7 dias. |
| `ADMIN_EMAIL` | API | E-mail do administrador inicial. Só é usado quando a tabela de usuários está vazia; depois do primeiro login pode ser removido. |
| `ADMIN_PASSWORD` | API | Senha do administrador inicial, com a mesma regra do `ADMIN_EMAIL`. |
| `CORS_ALLOWED_ORIGINS` | API | Origens do frontend autorizadas a chamar a API, separadas por vírgula. Em desenvolvimento, `http://localhost:5261`; em produção, o domínio público da `web`, por exemplo `https://viaflux.seudominio.com`. Sem a origem correta, o navegador bloqueia o login. |
| `NEXT_PUBLIC_API_URL` | Frontend | URL da API vista pelo navegador. Em produção é o domínio público da `api`, por exemplo `https://api.viaflux.seudominio.com`. |

> ⚠️ `NEXT_PUBLIC_*` é embutido no bundle do frontend e **fica visível para qualquer usuário**. Nunca coloque segredo nessa variável, porque ela existe só para endereço público.
>
> `NEXT_PUBLIC_API_URL` entra como argumento de build da imagem `web`. Mudar o valor no `.env` só tem efeito depois de reconstruir a imagem.

### Gerando o `JWT_SECRET`

```bash
openssl rand -base64 48
```

## Rodando em desenvolvimento

Preencha no `infra/.env` pelo menos `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Depois suba o banco:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

| Serviço | Endereço |
|---|---|
| PostgreSQL | `localhost:5432` |
| Adminer | <http://localhost:8081> |

No Adminer, use `db` como servidor, junto com `POSTGRES_DB` e `POSTGRES_USER` do arquivo `infra/.env`.

Se a porta 5432 já estiver ocupada, altere `POSTGRES_PORT` no seu `infra/.env`:

```
POSTGRES_PORT=5433
```

O Compose de desenvolvimento e a API usam essa mesma variável.

### API executada pela IDE ou Maven

A API usa uma única configuração e importa `infra/.env` como arquivo de propriedades. Execute-a com o diretório de trabalho em `apps/api` para que o caminho relativo seja resolvido corretamente; na IDE, configure esse diretório. Como alternativa, defina `VIAFLUX_ENV_FILE` com o caminho do arquivo `.env`. O arquivo precisa conter os valores do banco preenchidos; o `.env.example` deixa a senha vazia de propósito.

```bash
cd apps/api
./mvnw spring-boot:run
```

No Windows, use `.\mvnw.cmd spring-boot:run` no PowerShell ou `mvnw.cmd spring-boot:run` no Prompt de Comando. Em produção, o Compose injeta `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD`; nenhum perfil Spring é necessário.

A API sobe na porta 8281 e disponibiliza o healthcheck em <http://localhost:8281/health>. O frontend roda na porta 5261 (<http://localhost:5261>).

Na primeira subida com o banco vazio, a API cria o administrador com `ADMIN_EMAIL` e `ADMIN_PASSWORD` e registra no log `Administrador inicial criado`. Esse é o login usado no frontend.

### Autenticação

| Rota | Acesso | Descrição |
|---|---|---|
| `POST /auth/login` | Pública | Recebe `email` e `senha` e devolve `accessToken`, `refreshToken`, `expiresIn` e os dados do usuário com seus perfis. |
| `POST /auth/refresh` | Pública | Recebe `refreshToken` e devolve uma sessão nova no mesmo formato do login. |
| `GET /auth/me` | `Authorization: Bearer <accessToken>` | Devolve o usuário autenticado. |
| `GET /health` | Pública | Healthcheck. |

Todas as outras rotas exigem *access token*. O *refresh token* não é aceito como *access token*.

Para parar sem perder dados:

```bash
docker compose -f infra/docker-compose.yml down
```

O volume `db-data` sobrevive ao `down`. Para apagar o banco de propósito e começar do zero, use `down -v`.

## Rodando em produção (Dokploy)

O deploy usa um serviço do tipo **Compose** no Dokploy apontando para este repositório. São necessários dois domínios (ou subdomínios) apontando para o servidor: um para o frontend e outro para a API, porque o navegador chama a API diretamente.

1. **Criar o serviço.** No projeto do Dokploy, adicione um serviço *Compose*, conecte o repositório e a branch `main`, e defina o *Compose Path* como `./infra/docker-compose.prod.yml`.
2. **Variáveis.** Na aba *Environment*, cadastre as variáveis abaixo. O Dokploy grava esse conteúdo num `.env` ao lado do compose, que é de onde o arquivo lê os valores.

   ```
   POSTGRES_DB=viaflux
   POSTGRES_USER=viaflux
   POSTGRES_PASSWORD=<gere uma senha>
   JWT_SECRET=<openssl rand -base64 48>
   JWT_ACCESS_TTL=PT15M
   JWT_REFRESH_TTL=P7D
   ADMIN_EMAIL=<e-mail do primeiro administrador>
   ADMIN_PASSWORD=<senha do primeiro administrador>
   CORS_ALLOWED_ORIGINS=https://viaflux.seudominio.com
   NEXT_PUBLIC_API_URL=https://api.viaflux.seudominio.com
   ```

   `POSTGRES_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` e `NEXT_PUBLIC_API_URL` são obrigatórias: sem elas o deploy falha logo no início, com a mensagem indicando qual falta.
3. **Domínios.** Na aba *Domains*, adicione:

   | Serviço | Host | Porta do contêiner | HTTPS |
   |---|---|---|---|
   | `web` | `viaflux.seudominio.com` | `5261` | Let's Encrypt |
   | `api` | `api.viaflux.seudominio.com` | `8281` | Let's Encrypt |

   Os hosts precisam bater exatamente com `CORS_ALLOWED_ORIGINS` e `NEXT_PUBLIC_API_URL`, incluindo o `https://`.
4. **Deploy.** Clique em *Deploy*. A primeira construção leva alguns minutos (Maven e npm baixam as dependências). A ordem de subida é garantida pelos `healthcheck`: a `api` só inicia com o banco pronto, e a `web` só depois que a `api` responde em `/health`. Na primeira subida, o log da `api` mostra `Administrador inicial criado`.

> `NEXT_PUBLIC_API_URL` é embutida no frontend durante o build. Se o domínio da API mudar, altere a variável e faça um novo deploy, não basta reiniciar.

Os serviços usam a rede própria `viaflux`, e a API encontra o banco pelo alias `viaflux-db`. Isso evita colisão com serviços chamados `db` de outros projetos que também estejam na `dokploy-network`.

## Backup

No Dokploy, o caminho mais simples é usar o recurso de *Volume Backups* do painel nos volumes `db-data` e `anexos`, enviando para um destino S3. Para um dump lógico, o volume `backups` está montado no contêiner do banco; agende no servidor:

```bash
0 3 * * * docker exec <contêiner-do-db> pg_dump -U viaflux viaflux | gzip > /var/backups/viaflux-$(date +\%F).sql.gz
```

O nome do contêiner do banco aparece em `docker ps` e começa com o nome que o Dokploy deu ao serviço.

Duas coisas que o cron acima **não** faz e precisam ser resolvidas: copiar o dump para fora do servidor e apagar os antigos. Backup que só existe na máquina que pode falhar não é backup. O volume `anexos` precisa do mesmo tratamento, porque os arquivos não estão no dump.

## Pendências antes do primeiro deploy

| Item | Situação |
|---|---|
| Domínios da `web` e da `api` | A definir e apontar o DNS para o servidor do Dokploy |
| Rotina de backup fora do servidor | A definir junto com o destino dos dumps e dos anexos |
| Retenção e exclusão de dados pessoais | A definir com o cliente. O volume `anexos` guarda documento e foto de cliente sem prazo de descarte, o que a LGPD cobra |
