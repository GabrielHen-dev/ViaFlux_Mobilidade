ALTER TABLE viaflux.chamados
    RENAME COLUMN solicitante TO cliente;

CREATE SEQUENCE viaflux.chamados_numero_seq
    START WITH 1025
    INCREMENT BY 1;

ALTER TABLE viaflux.chamados
    ADD COLUMN codigo VARCHAR(20),
    ADD COLUMN telefone VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN modelo VARCHAR(120),
    ADD COLUMN placa VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN tipo VARCHAR(80),
    ADD COLUMN prioridade VARCHAR(20) NOT NULL DEFAULT 'Média',
    ADD COLUMN descricao TEXT NOT NULL DEFAULT '',
    ADD COLUMN localizacao VARCHAR(255) NOT NULL DEFAULT '';

UPDATE viaflux.chamados
SET codigo = 'VF-' || nextval('viaflux.chamados_numero_seq')::text,
    modelo = '',
    tipo = '';

ALTER TABLE viaflux.chamados
    ALTER COLUMN codigo SET NOT NULL,
    ALTER COLUMN modelo SET NOT NULL,
    ALTER COLUMN tipo SET NOT NULL;

ALTER TABLE viaflux.chamados
    ADD CONSTRAINT uk_chamados_codigo UNIQUE (codigo);
