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
| `DEV_TOOLS_HABILITADO` | API | `true` liga os endpoints `/api/dev/**` e a tela `/dev-tools` (sem link no menu, só para ADMIN), que populam e limpam dados de exemplo e têm um botão que apaga todos os chamados, usuários e organizações, mantendo só os usuários ADMIN. Padrão `false` em todos os ambientes. Em produção, ligue só enquanto precisar de dados de demonstração e desligue depois. |
| `DEV_TOOLS_SENHA` | API | Senha dos usuários de exemplo (`*@seed.viaflux.local`) criados pelo `/dev-tools`. Sem ela, o seed é recusado. Em produção use uma senha forte: quem souber pode entrar com qualquer perfil de exemplo. |
| `CORS_ALLOWED_ORIGINS` | API | Origens do frontend autorizadas a chamar a API, separadas por vírgula. Em desenvolvimento, `http://localhost:5261`; em produção, o domínio público da `web`, por exemplo `https://viaflux.seudominio.com`. Sem a origem correta, o navegador bloqueia o login. |
| `NOMINATIM_URL` | API | Servidor do OpenStreetMap Nominatim usado em `/api/enderecos/reverso` (endereço a partir do GPS) e `/api/enderecos/busca` (sugestão de ruas). Padrão `https://nominatim.openstreetmap.org`. O servidor público aceita no máximo 1 requisição por segundo; a API respeita esse limite e guarda as respostas em cache por algumas horas. |
| `VIACEP_URL` | API | Servidor do ViaCEP usado em `/api/enderecos/cep/{cep}`. Padrão `https://viacep.com.br`. |
| `ENDERECOS_USER_AGENT` | API | `User-Agent` enviado ao Nominatim e ao ViaCEP, exigido pela política de uso do Nominatim para identificar a aplicação. Vazio usa `ViaFlux-Mobilidade/1.0 (residencia-avanade-squad03)`. |
| `TRIAGEM_URGENCIA_ALTA_MINUTOS` | API | Prazo, em minutos, para o atendente concluir a triagem quando o cliente informa urgência alta. Padrão `10`. É um prazo provisório: a documentação ainda não define tempos-alvo com o cliente. |
| `TRIAGEM_URGENCIA_MEDIA_MINUTOS` | API | Prazo da triagem para urgência média. Padrão `20`. Também vale para chamados antigos, abertos sem contexto. |
| `TRIAGEM_URGENCIA_BAIXA_MINUTOS` | API | Prazo da triagem para urgência baixa. Padrão `40`. |
| `ANEXO_DIR` | API | Pasta onde a API grava fotos e documentos dos chamados. Padrão `./data/anexos`, relativo a `apps/api`. Em produção o Compose usa `VIAFLUX_ANEXO_DIR=/var/viaflux/anexos`, montado no volume `anexos`. |
| `ANEXO_LIMITE_MB` | API | Tamanho máximo de cada anexo, em MB. Padrão `10`. Mantenha igual a `NEXT_PUBLIC_ANEXO_LIMITE_MB` do frontend, se definido. |
| `ANEXO_ARMAZENAMENTO` | API | Onde os anexos ficam: `disco` (padrão, pasta `ANEXO_DIR`) ou `s3` (bucket compatível com S3, como Cloudflare R2, AWS S3 ou MinIO). Com `s3`, a API não sobe se faltar `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` ou `S3_SECRET_ACCESS_KEY`. Veja [Anexos no Cloudflare R2](#anexos-no-cloudflare-r2). |
| `S3_ENDPOINT` | API | Endereço da API S3 do provedor. No R2, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, sem o nome do bucket no final. |
| `S3_REGIAO` | API | Região do bucket. Padrão `auto`, que é o valor exigido pelo R2. Na AWS, use a região real, por exemplo `sa-east-1`. |
| `S3_BUCKET` | API | Nome do bucket. O bucket continua privado: os downloads passam sempre pela API, que confere quem pode ver o chamado. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | API | Credenciais com permissão de leitura e escrita de objetos no bucket. São segredo: nunca versione os valores reais. A API não registra esses valores no log. |
| `S3_PREFIXO` | API | Prefixo opcional das chaves dentro do bucket, por exemplo `anexos/`. Vazio grava na raiz do bucket. |
| `S3_PATH_STYLE` | API | `true` (padrão) monta as URLs como `endpoint/bucket/chave`, formato aceito pelo R2 e pelo MinIO. Use `false` só se o provedor exigir o estilo `bucket.endpoint`. |
| `PORTAL_URL` | API | Endereço público do frontend, usado para montar os links de verificação de e-mail e de redefinição de senha. Padrão `http://localhost:5261`. Obrigatória no Compose de produção. |
| `MAIL_HOST` | API | Servidor SMTP. Em desenvolvimento é o Mailpit do Compose, em `localhost`. Obrigatória no Compose de produção. |
| `MAIL_PORT` | API | Porta SMTP. Padrão `1025` (Mailpit) em desenvolvimento e `587` no Compose de produção. |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | API | Credenciais do provedor SMTP. Vazias no Mailpit. São segredo: nunca versione os valores reais. |
| `MAIL_SMTP_AUTH` / `MAIL_STARTTLS` | API | `true` para provedores reais, que exigem autenticação e TLS. `false` no Mailpit. |
| `MAIL_REMETENTE` | API | Remetente dos e-mails de conta. Padrão `ViaFlux Mobilidade <nao-responda@viaflux.local>`. |
| `VALIDADE_CONVITE` | API | Validade do link de convite enviado quando um administrador cadastra um usuário, no formato ISO-8601 de duração. Padrão `P7D` (7 dias). O link abre `PORTAL_URL/aceitar-convite`. |
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
| Mailpit (SMTP) | `localhost:1025` |
| Mailpit (caixa de entrada) | <http://localhost:8025> |

No Adminer, use `db` como servidor, junto com `POSTGRES_DB` e `POSTGRES_USER` do arquivo `infra/.env`.

O Mailpit captura todos os e-mails que a API envia (verificação de cadastro e redefinição de senha) sem entregá-los a ninguém. Abra a caixa de entrada em <http://localhost:8025> para clicar nos links.

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
| `POST /auth/cadastro` | Pública | Cria conta `CLIENTE` com `nome`, `email`, `senha`, `telefone` opcional e `aceiteDosTermos`, e envia o link de verificação (24 h). A resposta é a mesma se o e-mail já existir. |
| `POST /auth/verificacao` | Pública | Recebe o `token` do link e confirma o e-mail. Sem e-mail confirmado o usuário entra, mas não abre chamado. |
| `POST /auth/verificacao/reenvio` | Pública | Recebe `email` e gera um link de verificação novo, invalidando o anterior. |
| `POST /auth/senha/recuperacao` | Pública | Recebe `email` e envia o link de redefinição (30 min). A resposta não revela se a conta existe. |
| `POST /auth/senha/redefinicao` | Pública | Recebe `token` e `senha`, troca a senha e encerra todas as sessões abertas. |
| `GET /health` | Pública | Healthcheck. |

Todas as outras rotas exigem *access token*. O *refresh token* não é aceito como *access token*. Login, cadastro, reenvio e recuperação têm limite de 5 tentativas a cada 15 minutos por e-mail (e por origem, nas rotas de conta), com resposta `429`. O contador fica em memória e zera quando a API reinicia.

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

## Anexos no Cloudflare R2

Por padrão a API grava os anexos em disco, no volume `anexos`. Para usar um bucket do Cloudflare R2:

1. **Criar o bucket.** No painel da Cloudflare, abra *R2 Object Storage* → *Create bucket*, dê um nome (por exemplo `viaflux-anexos`) e mantenha o acesso público desligado. A API serve os arquivos depois de conferir a permissão de quem pede, então o bucket não precisa nem deve ser público.
2. **Criar o token de acesso.** Em *R2 Object Storage* → *Manage R2 API Tokens* → *Create API token*, escolha a permissão **Object Read & Write** e, em *Specify bucket(s)*, restrinja ao bucket criado. Ao confirmar, copie o **Access Key ID** e o **Secret Access Key**: o segredo só aparece uma vez.
3. **Descobrir o endpoint.** O **Account ID** aparece na página inicial do R2 e também nas configurações do bucket, no campo *S3 API*. O endpoint é `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, sem o nome do bucket no final. Buckets criados com jurisdição específica usam outro host, por exemplo `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`; nesse caso, copie o endereço exibido no campo *S3 API*.
4. **Preencher as variáveis.** Na aba *Environment* do Dokploy (ou no `infra/.env`, em desenvolvimento):

   ```
   ANEXO_ARMAZENAMENTO=s3
   S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   S3_REGIAO=auto
   S3_BUCKET=viaflux-anexos
   S3_ACCESS_KEY_ID=<Access Key ID>
   S3_SECRET_ACCESS_KEY=<Secret Access Key>
   S3_PREFIXO=anexos/
   ```

5. **Reiniciar a API.** Faça um novo deploy (ou reinicie o serviço `api`). Se alguma variável obrigatória estiver vazia, a API não sobe e o log informa qual falta.

A troca **não migra** os arquivos que já estão em disco: os anexos antigos continuam registrados no banco, mas passam a responder `404` até serem copiados para o bucket. Cada anexo é gravado com a chave `<S3_PREFIXO><id do arquivo>`, o mesmo nome que ele tem dentro de `ANEXO_DIR`, então basta sincronizar a pasta inteira para o prefixo configurado. Com o AWS CLI, a partir de `apps/api` (em produção, use a pasta do volume `anexos`, indicada por `docker volume inspect`):

```bash
AWS_ACCESS_KEY_ID=<Access Key ID> AWS_SECRET_ACCESS_KEY=<Secret Access Key> AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
  aws s3 sync ./data/anexos s3://viaflux-anexos/anexos/ --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com --region auto
```

Ou com o `rclone`, sem arquivo de configuração:

```bash
rclone copy ./data/anexos :s3:viaflux-anexos/anexos --s3-provider Cloudflare --s3-endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com \
  --s3-access-key-id <Access Key ID> --s3-secret-access-key <Secret Access Key> --s3-no-check-bucket
```

Troque `anexos/` pelo valor de `S3_PREFIXO` (ou deixe só o nome do bucket, se o prefixo estiver vazio). Para não perder envios feitos durante a troca, rode a cópia antes de reiniciar a API e repita logo depois: as duas ferramentas só enviam o que ainda não está no bucket. Mantenha o volume `anexos` até conferir que os downloads funcionam.

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
