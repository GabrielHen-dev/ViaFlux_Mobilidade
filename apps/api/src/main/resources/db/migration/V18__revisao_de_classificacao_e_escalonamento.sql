ALTER TABLE viaflux.chamados DROP CONSTRAINT ck_chamados_classificacao_estado;
ALTER TABLE viaflux.chamados ADD CONSTRAINT ck_chamados_classificacao_estado
    CHECK (classificacao_estado IN ('CLASSIFICADA', 'PENDENTE_CLASSIFICACAO', 'PENDENTE_ROTEAMENTO', 'REVISAO_PENDENTE'));

ALTER TABLE viaflux.chamados
    ADD COLUMN escalonado_em        TIMESTAMPTZ,
    ADD COLUMN escalonado_por_id    UUID,
    ADD COLUMN escalonado_por_nome  VARCHAR(150),
    ADD COLUMN escalonamento_motivo TEXT;

ALTER TABLE viaflux.chamado_evento DROP CONSTRAINT ck_chamado_evento_tipo;
ALTER TABLE viaflux.chamado_evento ADD CONSTRAINT ck_chamado_evento_tipo CHECK (tipo IN (
    'ABERTURA', 'TRIAGEM', 'CLASSIFICACAO', 'RECLASSIFICACAO', 'OVERRIDE', 'ROTEAMENTO', 'TRANSFERENCIA',
    'STATUS', 'ATUALIZACAO', 'ANEXO', 'LOCALIZACAO', 'SLA', 'FORNECEDOR', 'NOTIFICACAO', 'ESCALONAMENTO'
));
