ALTER TABLE viaflux.chamado_evento
    ADD COLUMN anexo_id        UUID REFERENCES viaflux.chamado_anexo (id) ON DELETE SET NULL,
    ADD COLUMN origem_mensagem VARCHAR(12),
    ADD CONSTRAINT ck_chamado_evento_origem_mensagem CHECK (origem_mensagem IN ('SOLICITANTE', 'EQUIPE'));

UPDATE viaflux.chamado_evento
SET origem_mensagem = CASE WHEN acao = 'Complemento do solicitante' THEN 'SOLICITANTE' ELSE 'EQUIPE' END
WHERE tipo = 'ATUALIZACAO';

CREATE TABLE viaflux.chamado_leitura (
    chamado_id UUID        NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    usuario_id UUID        NOT NULL REFERENCES viaflux.usuario (id) ON DELETE CASCADE,
    lido_ate   TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (chamado_id, usuario_id)
);

ALTER TABLE viaflux.notificacao
    ADD COLUMN email_adiado_desde TIMESTAMPTZ,
    ADD COLUMN email_tentativas   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX ix_notificacao_email_adiado
    ON viaflux.notificacao (email_adiado_desde)
    WHERE email_adiado_desde IS NOT NULL;
