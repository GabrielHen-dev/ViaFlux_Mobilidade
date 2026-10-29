ALTER TABLE viaflux.chamados
    ALTER COLUMN tipo_declarado DROP NOT NULL,
    ADD COLUMN motivo_outro VARCHAR(200),
    ADD COLUMN classificacao_estado VARCHAR(30) NOT NULL DEFAULT 'PENDENTE_CLASSIFICACAO',
    ADD COLUMN aberto_por_id UUID,
    ADD COLUMN aberto_por_nome VARCHAR(150),
    ADD COLUMN classificacao_versao VARCHAR(40),
    ADD COLUMN roteamento_versao VARCHAR(40),
    ADD COLUMN sla_versao VARCHAR(40),
    ADD COLUMN resolucao_resumo TEXT,
    ADD COLUMN fechado_em TIMESTAMPTZ,
    ADD COLUMN episodio INTEGER NOT NULL DEFAULT 1;

UPDATE viaflux.chamados SET classificacao_estado = 'CLASSIFICADA' WHERE triado_em IS NOT NULL;
ALTER TABLE viaflux.chamados ADD CONSTRAINT ck_chamados_classificacao_estado
    CHECK (classificacao_estado IN ('CLASSIFICADA', 'PENDENTE_CLASSIFICACAO', 'PENDENTE_ROTEAMENTO'));

ALTER TABLE viaflux.chamado_evento
    ADD COLUMN visibilidade VARCHAR(20) NOT NULL DEFAULT 'INTERNO',
    ADD CONSTRAINT ck_chamado_evento_visibilidade CHECK (visibilidade IN ('INTERNO', 'SOLICITANTE', 'FORNECEDOR'));

UPDATE viaflux.chamado_evento SET visibilidade = CASE WHEN visivel_cliente THEN 'SOLICITANTE' ELSE 'INTERNO' END;

ALTER TABLE viaflux.chamado_anexo
    ADD COLUMN visibilidade VARCHAR(20) NOT NULL DEFAULT 'INTERNO',
    ADD CONSTRAINT ck_chamado_anexo_visibilidade CHECK (visibilidade IN ('INTERNO', 'SOLICITANTE', 'FORNECEDOR'));

UPDATE viaflux.chamado_anexo anexo
SET visibilidade = 'SOLICITANTE'
FROM viaflux.chamados chamado
WHERE anexo.chamado_id = chamado.id
  AND anexo.autor_id IS NOT NULL
  AND anexo.autor_id = chamado.solicitante_id;

CREATE TABLE viaflux.regra_versao (
    tipo VARCHAR(30) NOT NULL,
    versao VARCHAR(40) NOT NULL,
    payload JSONB NOT NULL,
    vigencia_inicio TIMESTAMPTZ NOT NULL,
    vigencia_fim TIMESTAMPTZ,
    autor_id UUID,
    autor_nome VARCHAR(150) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL,
    justificativa TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL,
    PRIMARY KEY (tipo, versao),
    CONSTRAINT ck_regra_versao_estado CHECK (estado IN ('RASCUNHO', 'VIGENTE', 'ENCERRADA'))
);

INSERT INTO viaflux.regra_versao (tipo, versao, payload, vigencia_inicio, autor_nome, criado_em, justificativa, estado)
VALUES
    ('CLASSIFICACAO', 'classificacao-v1', '{"catalogo":"V1","score":"severidade+urgencia"}', now(), 'Sistema ViaFlux', now(), 'Baseline MVP conforme Especificacao_Implementacao_Pendencias_ViaFlux.md', 'VIGENTE'),
    ('ROTEAMENTO', 'roteamento-v1', '{"horario":"America/Fortaleza","dias":"SEG-SEX","inicio":"08:00","fim":"18:00"}', now(), 'Sistema ViaFlux', now(), 'Baseline MVP conforme Especificacao_Implementacao_Pendencias_ViaFlux.md', 'VIGENTE'),
    ('SLA', 'sla-v1', '{"P1":{"respostaMin":15,"resolucaoMin":120},"P2":{"respostaMin":30,"resolucaoMin":240},"P3":{"respostaUteis":120,"resolucaoUteis":1440},"P4":{"respostaUteis":240,"resolucaoUteis":2880}}', now(), 'Sistema ViaFlux', now(), 'Baseline MVP conforme Especificacao_Implementacao_Pendencias_ViaFlux.md', 'VIGENTE');

CREATE TABLE viaflux.feriado (
    data DATE PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    localidade VARCHAR(120) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE viaflux.concessao_acesso_chamado (
    id UUID PRIMARY KEY,
    chamado_id UUID NOT NULL REFERENCES viaflux.chamados(id),
    usuario_id UUID NOT NULL,
    justificativa TEXT NOT NULL,
    concedido_em TIMESTAMPTZ NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_concessao_acesso_janela CHECK (expira_em > concedido_em)
);

CREATE INDEX ix_concessao_acesso_usuario_janela ON viaflux.concessao_acesso_chamado (usuario_id, expira_em);
