ALTER TABLE viaflux.chamados
    ADD COLUMN solicitante_id UUID,
    ADD CONSTRAINT fk_chamados_solicitante
        FOREIGN KEY (solicitante_id) REFERENCES viaflux.usuario (id);

CREATE INDEX ix_chamados_solicitante_id
    ON viaflux.chamados (solicitante_id);
