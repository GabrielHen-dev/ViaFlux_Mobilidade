ALTER TABLE viaflux.chamados
    ADD COLUMN atendimento_responsavel_id   UUID,
    ADD COLUMN atendimento_responsavel_nome VARCHAR(150),
    ADD COLUMN atendimento_assumido_em      TIMESTAMPTZ;
