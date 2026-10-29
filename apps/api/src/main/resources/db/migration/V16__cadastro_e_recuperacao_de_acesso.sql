ALTER TABLE viaflux.usuario
    ADD COLUMN telefone VARCHAR(30),
    ADD COLUMN email_verificado_em TIMESTAMPTZ,
    ADD COLUMN termos_versao VARCHAR(40),
    ADD COLUMN termos_aceitos_em TIMESTAMPTZ,
    ADD COLUMN versao_da_sessao INTEGER NOT NULL DEFAULT 0;

UPDATE viaflux.usuario SET email_verificado_em = now();

CREATE TABLE viaflux.token_de_conta (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES viaflux.usuario(id),
    finalidade VARCHAR(20) NOT NULL,
    hash_do_token VARCHAR(64) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    usado_em TIMESTAMPTZ,
    CONSTRAINT ck_token_de_conta_finalidade CHECK (finalidade IN ('VERIFICACAO', 'REDEFINICAO')),
    CONSTRAINT uq_token_de_conta_hash UNIQUE (hash_do_token)
);

CREATE INDEX ix_token_de_conta_usuario ON viaflux.token_de_conta (usuario_id, finalidade);
