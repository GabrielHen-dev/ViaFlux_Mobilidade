ALTER TABLE viaflux.chamados
    ADD COLUMN cancelado_em        TIMESTAMPTZ,
    ADD COLUMN cancelado_por_id    UUID,
    ADD COLUMN cancelado_por_nome  VARCHAR(150),
    ADD COLUMN cancelamento_motivo TEXT;

UPDATE viaflux.chamados
SET status              = 'CANCELADO',
    motivo_aguardando   = NULL,
    cancelado_em        = excluido_em,
    cancelado_por_nome  = 'Sistema',
    cancelamento_motivo = 'Chamado estava na lixeira quando a lixeira foi substituída pelo cancelamento.'
WHERE excluido_em IS NOT NULL;

UPDATE viaflux.chamado_pausa pausa
SET fim = chamado.cancelado_em
FROM viaflux.chamados chamado
WHERE pausa.chamado_id = chamado.id
  AND chamado.status = 'CANCELADO'
  AND pausa.fim IS NULL;

DROP INDEX IF EXISTS viaflux.ix_chamados_excluido_em;

ALTER TABLE viaflux.chamados DROP COLUMN excluido_em;

CREATE INDEX ix_chamados_status ON viaflux.chamados (status);
