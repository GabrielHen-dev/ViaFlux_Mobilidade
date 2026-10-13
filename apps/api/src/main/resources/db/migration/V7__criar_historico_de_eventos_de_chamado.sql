CREATE TABLE viaflux.chamado_evento (
    id          UUID        PRIMARY KEY,
    chamado_id  UUID        NOT NULL REFERENCES viaflux.chamados (id) ON DELETE CASCADE,
    acao        VARCHAR(100) NOT NULL,
    detalhe     TEXT        NOT NULL,
    icone       VARCHAR(30) NOT NULL,
    ocorrido_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_chamado_evento_icone CHECK (
        icone IN ('aberto', 'triagem', 'encaminhado', 'atendimento', 'atualizacao', 'parceiro')
    )
);

CREATE INDEX ix_chamado_evento_chamado_ocorrido_em
    ON viaflux.chamado_evento (chamado_id, ocorrido_em, id);

INSERT INTO viaflux.chamado_evento (id, chamado_id, acao, detalhe, icone, ocorrido_em)
SELECT gen_random_uuid(), id, 'Chamado aberto', 'Chamado registrado pelo portal ViaFlux.', 'aberto', aberto_em
FROM viaflux.chamados;
