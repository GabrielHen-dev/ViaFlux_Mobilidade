ALTER TABLE viaflux.chamado_evento
    ADD COLUMN sequencia BIGSERIAL;

CREATE INDEX ix_chamado_evento_ordem ON viaflux.chamado_evento (chamado_id, ocorrido_em, sequencia);
