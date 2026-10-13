ALTER SEQUENCE viaflux.chamados_numero_seq
    MINVALUE 0;

SELECT setval(
    'viaflux.chamados_numero_seq',
    COALESCE(
        (
            SELECT MAX(substring(codigo FROM 4)::BIGINT) + 1
            FROM viaflux.chamados
            WHERE codigo ~ '^VF-[0-9]+$'
        ),
        0
    ),
    false
);
