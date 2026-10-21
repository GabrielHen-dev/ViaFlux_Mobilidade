CREATE TABLE viaflux.motivo (
    id         VARCHAR(40)  PRIMARY KEY,
    tipo       VARCHAR(40)  NOT NULL REFERENCES viaflux.departamento (codigo),
    descricao  VARCHAR(200) NOT NULL,
    severidade INTEGER      NOT NULL,
    ordem      INTEGER      NOT NULL,
    CONSTRAINT ck_motivo_severidade CHECK (severidade IN (1, 3, 5))
);

CREATE TABLE viaflux.contexto (
    id        VARCHAR(40)  PRIMARY KEY,
    tipo      VARCHAR(40)  NOT NULL REFERENCES viaflux.departamento (codigo),
    descricao VARCHAR(200) NOT NULL,
    urgencia  INTEGER      NOT NULL,
    ordem     INTEGER      NOT NULL,
    CONSTRAINT ck_contexto_urgencia CHECK (urgencia IN (1, 3, 5))
);

INSERT INTO viaflux.motivo (id, tipo, descricao, severidade, ordem) VALUES
    ('M-ASSISTENCIA_24H-1', 'ASSISTENCIA_24H', 'Veículo não liga / Pane elétrica ou mecânica', 5, 1),
    ('M-ASSISTENCIA_24H-2', 'ASSISTENCIA_24H', 'Acidente / Colisão / Sinistro com veículo', 5, 2),
    ('M-ASSISTENCIA_24H-3', 'ASSISTENCIA_24H', 'Roubo, furto ou tentativa de assalto', 5, 3),
    ('M-ASSISTENCIA_24H-4', 'ASSISTENCIA_24H', 'Pneu furado / Roda danificada / Avaria leve', 3, 4),
    ('M-ASSISTENCIA_24H-5', 'ASSISTENCIA_24H', 'Chave trancada no interior ou perda de chave', 1, 5),
    ('M-MANUTENCAO-1', 'MANUTENCAO', 'Falha no sistema de freios, direção ou suspensão', 5, 1),
    ('M-MANUTENCAO-2', 'MANUTENCAO', 'Superaquecimento do motor ou vazamento de fluido', 5, 2),
    ('M-MANUTENCAO-3', 'MANUTENCAO', 'Luz de alerta ou injeção acesa no painel', 3, 3),
    ('M-MANUTENCAO-4', 'MANUTENCAO', 'Falha no ar-condicionado, vidros ou travas elétricas', 1, 4),
    ('M-MANUTENCAO-5', 'MANUTENCAO', 'Agendamento de revisão preventiva / Troca de óleo', 1, 5),
    ('M-LOGISTICA-1', 'LOGISTICA', 'Bloqueio ou atraso na entrega de frota corporativa (>1 veículo)', 5, 1),
    ('M-LOGISTICA-2', 'LOGISTICA', 'Falta de veículo disponível na unidade para reserva confirmada', 5, 2),
    ('M-LOGISTICA-3', 'LOGISTICA', 'Solicitação de veículo reserva para substituição', 3, 3),
    ('M-LOGISTICA-4', 'LOGISTICA', 'Divergência no checklist de vistoria (retirada ou devolução)', 3, 4),
    ('M-LOGISTICA-5', 'LOGISTICA', 'Agendamento de transferência de veículo entre unidades', 1, 5),
    ('M-TI-1', 'TI', 'Sistema de locação/entrega de veículos fora do ar na unidade', 5, 1),
    ('M-TI-2', 'TI', 'Queda total de internet ou rede na filial', 5, 2),
    ('M-TI-3', 'TI', 'Erro ao registrar contrato ou processar pagamento no balcão', 3, 3),
    ('M-TI-4', 'TI', 'Falha em impressora, leitor ou totem de atendimento', 1, 4),
    ('M-TI-5', 'TI', 'Solicitação de acesso, reset de senha ou permissão de usuário', 1, 5),
    ('M-FINANCEIRO-1', 'FINANCEIRO', 'Cobrança indevida com bloqueio de faturamento/cartão do cliente', 5, 1),
    ('M-FINANCEIRO-2', 'FINANCEIRO', 'Divergência de valores na fatura de frota corporativa', 3, 2),
    ('M-FINANCEIRO-3', 'FINANCEIRO', 'Contestação de cobrança de multa, pedágio ou avaria', 3, 3),
    ('M-FINANCEIRO-4', 'FINANCEIRO', 'Solicitação de 2ª via de boleto ou nota fiscal', 1, 4),
    ('M-FINANCEIRO-5', 'FINANCEIRO', 'Dúvida simples sobre cobrança, caução ou reembolso', 1, 5),
    ('M-CONTRATOS-1', 'CONTRATOS', 'Bloqueio contratual impedindo retirada imediata de veículo', 5, 1),
    ('M-CONTRATOS-2', 'CONTRATOS', 'Renovação ou prorrogação de contrato prestes a vencer', 3, 2),
    ('M-CONTRATOS-3', 'CONTRATOS', 'Inclusão ou substituição de condutor autorizado no contrato', 3, 3),
    ('M-CONTRATOS-4', 'CONTRATOS', 'Solicitação de aditivo de quilometragem ou alteração de plano', 1, 4),
    ('M-CONTRATOS-5', 'CONTRATOS', 'Dúvida sobre cláusulas contratuais, franquia ou cobertura de seguro', 1, 5);

INSERT INTO viaflux.contexto (id, tipo, descricao, urgencia, ordem) VALUES
    ('C-ASSISTENCIA_24H-1', 'ASSISTENCIA_24H', 'Veículo parado em rodovia, via rápida ou local de risco', 5, 1),
    ('C-ASSISTENCIA_24H-2', 'ASSISTENCIA_24H', 'Motorista ou passageiros em trânsito aguardando socorro na rua', 5, 2),
    ('C-ASSISTENCIA_24H-3', 'ASSISTENCIA_24H', 'Veículo parado em via urbana comum com trânsito livre', 3, 3),
    ('C-ASSISTENCIA_24H-4', 'ASSISTENCIA_24H', 'Veículo estacionado em local seguro (garagem, pátio ou estacionamento)', 1, 4),
    ('C-ASSISTENCIA_24H-5', 'ASSISTENCIA_24H', 'Cliente já atendido com transporte alternativo, aguardando apenas remoção', 1, 5),
    ('C-MANUTENCAO-1', 'MANUTENCAO', 'Veículo sem condições seguras de rodagem e necessário para operação hoje', 5, 1),
    ('C-MANUTENCAO-2', 'MANUTENCAO', 'Veículo de frota corporativa sem substituto imediato disponível', 5, 2),
    ('C-MANUTENCAO-3', 'MANUTENCAO', 'Veículo rodando com limitação, precisando de oficina nas próximas 24h', 3, 3),
    ('C-MANUTENCAO-4', 'MANUTENCAO', 'Veículo já recolhido no pátio da unidade aguardando vaga na oficina', 1, 4),
    ('C-MANUTENCAO-5', 'MANUTENCAO', 'Manutenção programada sem impacto imediato na operação', 1, 5),
    ('C-LOGISTICA-1', 'LOGISTICA', 'Cliente ou motorista aguardando presencialmente no balcão da unidade', 5, 1),
    ('C-LOGISTICA-2', 'LOGISTICA', 'Operação de cliente corporativo paralisada aguardando os veículos', 5, 2),
    ('C-LOGISTICA-3', 'LOGISTICA', 'Retirada ou entrega de veículos programada para o mesmo dia', 3, 3),
    ('C-LOGISTICA-4', 'LOGISTICA', 'Movimentação de frota programada para as próximas 24h a 48h', 1, 4),
    ('C-LOGISTICA-5', 'LOGISTICA', 'Ajuste logístico de rotina ou reposição de pátio sem reserva atrelada', 1, 5),
    ('C-TI-1', 'TI', 'Unidade totalmente impedida de operar e com fila de clientes no balcão', 5, 1),
    ('C-TI-2', 'TI', 'Operação 24/7 ou unidade de aeroporto travada sem contingência', 5, 2),
    ('C-TI-3', 'TI', 'Unidade operando parcialmente com procedimento manual de contingência', 3, 3),
    ('C-TI-4', 'TI', 'Falha afeta apenas um terminal/usuário, demais postos funcionando', 1, 4),
    ('C-TI-5', 'TI', 'Solicitação técnica de rotina sem impacto no atendimento ao cliente', 1, 5),
    ('C-FINANCEIRO-1', 'FINANCEIRO', 'Cliente impedido de retirar veículo ou operar devido à pendência financeira', 5, 1),
    ('C-FINANCEIRO-2', 'FINANCEIRO', 'Fatura corporativa com vencimento no dia atual', 5, 2),
    ('C-FINANCEIRO-3', 'FINANCEIRO', 'Fatura ou pagamento com vencimento nos próximos 3 dias úteis', 3, 3),
    ('C-FINANCEIRO-4', 'FINANCEIRO', 'Fechamento contábil mensal da empresa cliente em andamento', 3, 4),
    ('C-FINANCEIRO-5', 'FINANCEIRO', 'Consulta financeira para conferência futura (sem vencimento próximo)', 1, 5),
    ('C-CONTRATOS-1', 'CONTRATOS', 'Motorista no balcão aguardando liberação contratual para sair com o veículo', 5, 1),
    ('C-CONTRATOS-2', 'CONTRATOS', 'Contrato ativo vencendo nas próximas 24 horas com veículo em uso', 5, 2),
    ('C-CONTRATOS-3', 'CONTRATOS', 'Alteração contratual necessária para operação nesta semana', 3, 3),
    ('C-CONTRATOS-4', 'CONTRATOS', 'Adequação cadastral ou documental de rotina', 1, 4),
    ('C-CONTRATOS-5', 'CONTRATOS', 'Simples consulta de termos contratuais para planejamento', 1, 5);

ALTER TABLE viaflux.organizacao
    ADD COLUMN especialidade VARCHAR(120);

ALTER TABLE viaflux.chamados
    ADD COLUMN motivo_id                VARCHAR(40) REFERENCES viaflux.motivo (id),
    ADD COLUMN contexto_id              VARCHAR(40) REFERENCES viaflux.contexto (id),
    ADD COLUMN tipo_declarado           VARCHAR(40) REFERENCES viaflux.departamento (codigo),
    ADD COLUMN urgencia_declarada       INTEGER,
    ADD COLUMN classificacao_tipo       VARCHAR(40) REFERENCES viaflux.departamento (codigo),
    ADD COLUMN severidade               INTEGER,
    ADD COLUMN urgencia                 INTEGER,
    ADD COLUMN override_prioridade      VARCHAR(2),
    ADD COLUMN override_justificativa   TEXT,
    ADD COLUMN override_autor_id        UUID,
    ADD COLUMN override_autor_nome      VARCHAR(150),
    ADD COLUMN override_definido_em     TIMESTAMPTZ,
    ADD COLUMN departamento_codigo      VARCHAR(40) REFERENCES viaflux.departamento (codigo),
    ADD COLUMN motivo_aguardando        VARCHAR(30),
    ADD COLUMN triagem_prazo_minutos    INTEGER,
    ADD COLUMN triagem_limite           TIMESTAMPTZ,
    ADD COLUMN triagem_iniciada_em      TIMESTAMPTZ,
    ADD COLUMN triagem_responsavel_id   UUID,
    ADD COLUMN triagem_responsavel_nome VARCHAR(150),
    ADD COLUMN triado_em                TIMESTAMPTZ,
    ADD COLUMN triado_por_id            UUID,
    ADD COLUMN triado_por_nome          VARCHAR(150),
    ADD COLUMN primeira_resposta_em     TIMESTAMPTZ,
    ADD COLUMN resolvido_em             TIMESTAMPTZ,
    ADD COLUMN excluido_em              TIMESTAMPTZ,
    ADD COLUMN atualizado_em            TIMESTAMPTZ,
    ADD COLUMN chave_idempotencia       VARCHAR(160),
    ADD COLUMN latitude                 DOUBLE PRECISION,
    ADD COLUMN longitude                DOUBLE PRECISION,
    ADD COLUMN cep                      VARCHAR(9)   NOT NULL DEFAULT '',
    ADD COLUMN logradouro               VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN numero                   VARCHAR(20)  NOT NULL DEFAULT '',
    ADD COLUMN complemento              VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN bairro                   VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN cidade                   VARCHAR(120) NOT NULL DEFAULT '',
    ADD COLUMN uf                       VARCHAR(2)   NOT NULL DEFAULT '',
    ADD CONSTRAINT uk_chamados_chave_idempotencia UNIQUE (chave_idempotencia),
    ADD CONSTRAINT ck_chamados_pesos CHECK (
        (severidade IS NULL OR severidade IN (1, 3, 5)) AND (urgencia IS NULL OR urgencia IN (1, 3, 5))
    ),
    ADD CONSTRAINT ck_chamados_override CHECK (override_prioridade IS NULL OR override_prioridade IN ('P1', 'P2', 'P3', 'P4')),
    ADD CONSTRAINT ck_chamados_motivo_aguardando CHECK (
        motivo_aguardando IS NULL OR motivo_aguardando IN ('CLIENTE', 'FORNECEDOR', 'OUTRO_DEPARTAMENTO')
    );

UPDATE viaflux.chamados
SET tipo_declarado = CASE tipo
        WHEN 'Mecânico' THEN 'MANUTENCAO'
        WHEN 'Manutenção' THEN 'MANUTENCAO'
        WHEN 'Sistema' THEN 'TI'
        WHEN 'Tecnologia' THEN 'TI'
        WHEN 'Logística' THEN 'LOGISTICA'
        WHEN 'Financeiro' THEN 'FINANCEIRO'
        WHEN 'Contratos' THEN 'CONTRATOS'
        ELSE 'ASSISTENCIA_24H'
    END,
    triagem_prazo_minutos = 20,
    triagem_limite = aberto_em + INTERVAL '20 minutes',
    atualizado_em = aberto_em;

UPDATE viaflux.chamados
SET classificacao_tipo = tipo_declarado,
    departamento_codigo = tipo_declarado,
    severidade = CASE prioridade WHEN 'Crítica' THEN 5 WHEN 'Alta' THEN 5 ELSE 3 END,
    urgencia = CASE prioridade WHEN 'Crítica' THEN 5 WHEN 'Alta' THEN 3 WHEN 'Média' THEN 3 ELSE 1 END,
    triado_em = aberto_em + INTERVAL '5 minutes',
    triado_por_nome = 'Central ViaFlux'
WHERE status NOT IN ('ABERTO', 'EM_TRIAGEM');

UPDATE viaflux.chamados
SET status = 'ABERTO'
WHERE status = 'EM_TRIAGEM';

ALTER TABLE viaflux.chamados
    ALTER COLUMN tipo_declarado SET NOT NULL,
    ALTER COLUMN triagem_prazo_minutos SET NOT NULL,
    ALTER COLUMN triagem_limite SET NOT NULL,
    ALTER COLUMN atualizado_em SET NOT NULL,
    DROP COLUMN tipo,
    DROP COLUMN prioridade;

CREATE INDEX ix_chamados_departamento ON viaflux.chamados (departamento_codigo);
CREATE INDEX ix_chamados_excluido_em ON viaflux.chamados (excluido_em);

ALTER TABLE viaflux.chamado_evento
    DROP CONSTRAINT ck_chamado_evento_icone,
    ADD COLUMN tipo            VARCHAR(20),
    ADD COLUMN autor_id        UUID,
    ADD COLUMN autor_nome      VARCHAR(150),
    ADD COLUMN visivel_cliente BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE viaflux.chamado_evento
SET tipo = CASE icone
        WHEN 'aberto' THEN 'ABERTURA'
        WHEN 'triagem' THEN 'CLASSIFICACAO'
        WHEN 'encaminhado' THEN 'ROTEAMENTO'
        WHEN 'atendimento' THEN 'STATUS'
        WHEN 'parceiro' THEN 'FORNECEDOR'
        ELSE 'ATUALIZACAO'
    END;

UPDATE viaflux.chamados c
SET primeira_resposta_em = (
        SELECT MIN(e.ocorrido_em) FROM viaflux.chamado_evento e WHERE e.chamado_id = c.id AND e.icone = 'atendimento'
    ),
    resolvido_em = (
        SELECT MIN(e.ocorrido_em) FROM viaflux.chamado_evento e WHERE e.chamado_id = c.id AND e.acao = 'Chamado resolvido'
    );

ALTER TABLE viaflux.chamado_evento
    ALTER COLUMN tipo SET NOT NULL,
    DROP COLUMN icone,
    ADD CONSTRAINT ck_chamado_evento_tipo CHECK (tipo IN (
        'ABERTURA', 'TRIAGEM', 'CLASSIFICACAO', 'RECLASSIFICACAO', 'OVERRIDE', 'ROTEAMENTO', 'TRANSFERENCIA',
        'STATUS', 'ATUALIZACAO', 'ANEXO', 'LOCALIZACAO', 'SLA', 'FORNECEDOR', 'NOTIFICACAO'
    ));

CREATE TABLE viaflux.chamado_pausa (
    chamado_id UUID        NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    inicio     TIMESTAMPTZ NOT NULL,
    fim        TIMESTAMPTZ,
    PRIMARY KEY (chamado_id, inicio)
);

CREATE TABLE viaflux.chamado_anexo (
    id                 UUID         PRIMARY KEY,
    chamado_id         UUID         NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    nome               VARCHAR(255) NOT NULL,
    tipo_conteudo      VARCHAR(100) NOT NULL,
    tamanho            BIGINT       NOT NULL,
    arquivo            VARCHAR(80)  NOT NULL,
    enviado_em         TIMESTAMPTZ  NOT NULL,
    autor_id           UUID,
    autor_nome         VARCHAR(150),
    chave_idempotencia VARCHAR(160),
    CONSTRAINT uk_chamado_anexo_chave UNIQUE (chamado_id, chave_idempotencia)
);

CREATE INDEX ix_chamado_anexo_chamado ON viaflux.chamado_anexo (chamado_id, enviado_em);

CREATE TABLE viaflux.servico_terceiro (
    id            UUID         PRIMARY KEY,
    chamado_id    UUID         NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    fornecedor_id UUID         NOT NULL REFERENCES viaflux.organizacao (id),
    tipo_servico  VARCHAR(120) NOT NULL,
    local         VARCHAR(255) NOT NULL DEFAULT '',
    observacao    TEXT         NOT NULL DEFAULT '',
    status        VARCHAR(20)  NOT NULL,
    atualizado_em TIMESTAMPTZ  NOT NULL,
    cancelado     BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_servico_terceiro_status CHECK (status IN ('SOLICITADO', 'RECEBIDO', 'EM_EXECUCAO', 'CONCLUIDO'))
);

CREATE INDEX ix_servico_terceiro_chamado ON viaflux.servico_terceiro (chamado_id);
CREATE INDEX ix_servico_terceiro_fornecedor ON viaflux.servico_terceiro (fornecedor_id);

CREATE TABLE viaflux.servico_atualizacao (
    id            UUID         PRIMARY KEY,
    servico_id    UUID         NOT NULL REFERENCES viaflux.servico_terceiro (id) ON DELETE CASCADE,
    status        VARCHAR(20)  NOT NULL,
    observacao    TEXT         NOT NULL DEFAULT '',
    registrado_em TIMESTAMPTZ  NOT NULL,
    autor_id      UUID,
    autor_nome    VARCHAR(150) NOT NULL
);

CREATE INDEX ix_servico_atualizacao_servico ON viaflux.servico_atualizacao (servico_id, registrado_em);

CREATE TABLE viaflux.notificacao (
    id              UUID         PRIMARY KEY,
    destinatario_id UUID         NOT NULL REFERENCES viaflux.usuario (id) ON DELETE CASCADE,
    chamado_id      UUID         NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    chamado_codigo  VARCHAR(20)  NOT NULL,
    novo_status     VARCHAR(80)  NOT NULL,
    mensagem        VARCHAR(255) NOT NULL,
    criada_em       TIMESTAMPTZ  NOT NULL,
    lida            BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_notificacao_destinatario ON viaflux.notificacao (destinatario_id, criada_em DESC);
