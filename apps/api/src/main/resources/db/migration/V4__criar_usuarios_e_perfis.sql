CREATE TABLE viaflux.perfil (
    codigo    VARCHAR(40)  PRIMARY KEY,
    descricao VARCHAR(120) NOT NULL
);

INSERT INTO viaflux.perfil (codigo, descricao) VALUES
    ('ADMIN', 'Administrador'),
    ('ATENDENTE_UNIDADE', 'Atendente de unidade'),
    ('TECNOLOGIA', 'Tecnologia'),
    ('ASSISTENCIA', 'Assistência'),
    ('MANUTENCAO', 'Manutenção'),
    ('FINANCEIRO', 'Financeiro'),
    ('FORNECEDOR', 'Fornecedor'),
    ('CLIENTE_CORPORATIVO', 'Cliente corporativo'),
    ('MOTORISTA', 'Motorista');

CREATE TABLE viaflux.usuario (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       VARCHAR(120) NOT NULL,
    email      VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(100) NOT NULL,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_email_minusculo CHECK (email = lower(email))
);

CREATE TABLE viaflux.usuario_perfil (
    usuario_id    UUID        NOT NULL REFERENCES viaflux.usuario (id) ON DELETE CASCADE,
    perfil_codigo VARCHAR(40) NOT NULL REFERENCES viaflux.perfil (codigo),
    PRIMARY KEY (usuario_id, perfil_codigo)
);
