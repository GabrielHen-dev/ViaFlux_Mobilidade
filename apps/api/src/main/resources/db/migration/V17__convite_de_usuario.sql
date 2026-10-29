ALTER TABLE viaflux.usuario ALTER COLUMN senha_hash DROP NOT NULL;

ALTER TABLE viaflux.token_de_conta DROP CONSTRAINT ck_token_de_conta_finalidade;

ALTER TABLE viaflux.token_de_conta
    ADD CONSTRAINT ck_token_de_conta_finalidade CHECK (finalidade IN ('VERIFICACAO', 'REDEFINICAO', 'CONVITE'));
