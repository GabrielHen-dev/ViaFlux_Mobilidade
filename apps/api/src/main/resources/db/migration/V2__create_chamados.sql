CREATE TABLE chamados (
    id UUID PRIMARY KEY,
    solicitante VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL,
    aberto_em TIMESTAMP WITH TIME ZONE NOT NULL
);
