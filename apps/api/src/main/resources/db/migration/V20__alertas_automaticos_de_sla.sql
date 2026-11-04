INSERT INTO viaflux.perfil (codigo, descricao) VALUES ('LIDER_DEPARTAMENTO', 'Líder de departamento')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE viaflux.alerta_sla (
    id           UUID        PRIMARY KEY,
    chamado_id   UUID        NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    prazo        VARCHAR(20) NOT NULL,
    limiar       VARCHAR(30) NOT NULL,
    prioridade   VARCHAR(2)  NOT NULL,
    disparado_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_alerta_sla_chamado_prazo_limiar UNIQUE (chamado_id, prazo, limiar),
    CONSTRAINT ck_alerta_sla_prazo CHECK (prazo IN ('PRIMEIRA_RESPOSTA', 'RESOLUCAO')),
    CONSTRAINT ck_alerta_sla_limiar CHECK (limiar IN (
        'CINQUENTA_POR_CENTO', 'OITENTA_POR_CENTO', 'CEM_POR_CENTO', 'P1_SEM_PRIMEIRA_RESPOSTA'
    ))
);

CREATE TABLE viaflux.alerta_sla_entrega (
    id                   UUID         PRIMARY KEY,
    alerta_id            UUID         NOT NULL REFERENCES viaflux.alerta_sla (id) ON DELETE CASCADE,
    destinatario_id      UUID         NOT NULL REFERENCES viaflux.usuario (id) ON DELETE CASCADE,
    destinatario_nome    VARCHAR(255) NOT NULL,
    assunto              VARCHAR(80)  NOT NULL,
    mensagem             VARCHAR(255) NOT NULL,
    estado               VARCHAR(20)  NOT NULL,
    tentativas           INTEGER      NOT NULL DEFAULT 0,
    proxima_tentativa_em TIMESTAMPTZ,
    ultima_falha_em      TIMESTAMPTZ,
    entregue_em          TIMESTAMPTZ,
    CONSTRAINT uq_alerta_sla_entrega_destinatario UNIQUE (alerta_id, destinatario_id),
    CONSTRAINT ck_alerta_sla_entrega_estado CHECK (estado IN ('PENDENTE', 'ENTREGUE', 'ESGOTADA'))
);

CREATE INDEX ix_alerta_sla_entrega_pendente
    ON viaflux.alerta_sla_entrega (proxima_tentativa_em)
    WHERE estado = 'PENDENTE';
