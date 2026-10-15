CREATE TABLE viaflux.organizacao (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       VARCHAR(160) NOT NULL,
    tipo       VARCHAR(20)  NOT NULL,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_organizacao_tipo CHECK (tipo IN ('CLIENTE', 'FORNECEDOR'))
);

CREATE TABLE viaflux.departamento (
    codigo     VARCHAR(40)  PRIMARY KEY,
    nome       VARCHAR(120) NOT NULL,
    ativo      BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO viaflux.departamento (codigo, nome) VALUES
    ('ASSISTENCIA_24H', 'Assistência 24h'),
    ('MANUTENCAO', 'Manutenção'),
    ('LOGISTICA', 'Logística'),
    ('TI', 'Tecnologia'),
    ('FINANCEIRO', 'Financeiro'),
    ('CONTRATOS', 'Contratos');

ALTER TABLE viaflux.usuario
    ADD COLUMN organizacao_id UUID REFERENCES viaflux.organizacao (id);

CREATE INDEX ix_usuario_organizacao_id ON viaflux.usuario (organizacao_id);

CREATE TABLE viaflux.usuario_departamento (
    usuario_id         UUID       NOT NULL REFERENCES viaflux.usuario (id) ON DELETE CASCADE,
    departamento_codigo VARCHAR(40) NOT NULL REFERENCES viaflux.departamento (codigo),
    PRIMARY KEY (usuario_id, departamento_codigo)
);

CREATE INDEX ix_usuario_departamento_departamento
    ON viaflux.usuario_departamento (departamento_codigo);

INSERT INTO viaflux.perfil (codigo, descricao) VALUES
    ('CLIENTE', 'Cliente'),
    ('GESTOR_FROTA', 'Gestor de frota'),
    ('ATENDENTE', 'Atendente'),
    ('DEPARTAMENTO', 'Departamento'),
    ('LIDER_OPERACIONAL', 'Líder operacional')
ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao;

INSERT INTO viaflux.usuario_perfil (usuario_id, perfil_codigo)
SELECT usuario_id,
       CASE perfil_codigo
           WHEN 'ATENDENTE_UNIDADE' THEN 'ATENDENTE'
           WHEN 'CLIENTE_CORPORATIVO' THEN 'GESTOR_FROTA'
           WHEN 'MOTORISTA' THEN 'CLIENTE'
           WHEN 'TECNOLOGIA' THEN 'DEPARTAMENTO'
           WHEN 'ASSISTENCIA' THEN 'DEPARTAMENTO'
           WHEN 'MANUTENCAO' THEN 'DEPARTAMENTO'
           WHEN 'FINANCEIRO' THEN 'DEPARTAMENTO'
       END
FROM viaflux.usuario_perfil
WHERE perfil_codigo IN (
    'ATENDENTE_UNIDADE', 'CLIENTE_CORPORATIVO', 'MOTORISTA',
    'TECNOLOGIA', 'ASSISTENCIA', 'MANUTENCAO', 'FINANCEIRO'
)
ON CONFLICT DO NOTHING;

INSERT INTO viaflux.usuario_departamento (usuario_id, departamento_codigo)
SELECT usuario_id,
       CASE perfil_codigo
           WHEN 'TECNOLOGIA' THEN 'TI'
           WHEN 'ASSISTENCIA' THEN 'ASSISTENCIA_24H'
           WHEN 'MANUTENCAO' THEN 'MANUTENCAO'
           WHEN 'FINANCEIRO' THEN 'FINANCEIRO'
       END
FROM viaflux.usuario_perfil
WHERE perfil_codigo IN ('TECNOLOGIA', 'ASSISTENCIA', 'MANUTENCAO', 'FINANCEIRO')
ON CONFLICT DO NOTHING;

DELETE FROM viaflux.usuario_perfil
WHERE perfil_codigo IN (
    'ATENDENTE_UNIDADE', 'CLIENTE_CORPORATIVO', 'MOTORISTA',
    'TECNOLOGIA', 'ASSISTENCIA', 'MANUTENCAO', 'FINANCEIRO'
);

DELETE FROM viaflux.perfil
WHERE codigo IN (
    'ATENDENTE_UNIDADE', 'CLIENTE_CORPORATIVO', 'MOTORISTA',
    'TECNOLOGIA', 'ASSISTENCIA', 'MANUTENCAO', 'FINANCEIRO'
);
