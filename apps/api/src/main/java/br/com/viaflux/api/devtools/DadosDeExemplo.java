package br.com.viaflux.api.devtools;

import java.util.List;

final class DadosDeExemplo {

    static final String DOMINIO_DOS_EMAILS = "@seed.viaflux.local";

    record OrganizacaoDeExemplo(String nome, String tipo) {
    }

    record UsuarioDeExemplo(
            String nome,
            String email,
            List<String> perfis,
            String organizacao,
            List<String> departamentos,
            boolean abreChamados
    ) {
    }

    record CenarioDeChamado(
            String tipo,
            String prioridade,
            String descricao,
            String modelo,
            String placa,
            String localizacao
    ) {
    }

    static final List<OrganizacaoDeExemplo> ORGANIZACOES = List.of(
            new OrganizacaoDeExemplo("Transportes Sul Ltda", "CLIENTE"),
            new OrganizacaoDeExemplo("Guincho ViaRápido", "FORNECEDOR"),
            new OrganizacaoDeExemplo("Oficina TechTruck", "FORNECEDOR")
    );

    static final List<UsuarioDeExemplo> USUARIOS = List.of(
            new UsuarioDeExemplo("Ana Ribeiro", "cliente.ana" + DOMINIO_DOS_EMAILS, List.of("CLIENTE"), null, List.of(), true),
            new UsuarioDeExemplo("Bruno Lima", "cliente.bruno" + DOMINIO_DOS_EMAILS, List.of("CLIENTE"), null, List.of(), true),
            new UsuarioDeExemplo("Gestão de Frota Transportes Sul", "gestor.frota" + DOMINIO_DOS_EMAILS, List.of("GESTOR_FROTA"), "Transportes Sul Ltda", List.of(), true),
            new UsuarioDeExemplo("Paula Atendente", "atendente" + DOMINIO_DOS_EMAILS, List.of("ATENDENTE"), null, List.of(), false),
            new UsuarioDeExemplo("Diego Assistência", "assistencia" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("ASSISTENCIA_24H"), false),
            new UsuarioDeExemplo("Marina Manutenção", "manutencao" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("MANUTENCAO"), false),
            new UsuarioDeExemplo("Tiago Tecnologia", "ti" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("TI"), false),
            new UsuarioDeExemplo("Lúcia Líder", "lider" + DOMINIO_DOS_EMAILS, List.of("LIDER_OPERACIONAL"), null, List.of(), false),
            new UsuarioDeExemplo("Guincho ViaRápido", "guincho" + DOMINIO_DOS_EMAILS, List.of("FORNECEDOR"), "Guincho ViaRápido", List.of(), false),
            new UsuarioDeExemplo("Oficina TechTruck", "oficina" + DOMINIO_DOS_EMAILS, List.of("FORNECEDOR"), "Oficina TechTruck", List.of(), false)
    );

    static final List<CenarioDeChamado> CENARIOS = List.of(
            new CenarioDeChamado("Assistência 24h", "Crítica", "Veículo não liga e está parado no acostamento da rodovia.", "Volvo FH 460", "RTA-1D23", "BR-116, km 312, Guarulhos – SP"),
            new CenarioDeChamado("Assistência 24h", "Alta", "Pneu furado com motorista aguardando socorro na rua.", "Fiat Strada", "QWE-4F56", "Av. Paulista, 1500, São Paulo – SP"),
            new CenarioDeChamado("Assistência 24h", "Baixa", "Chave trancada dentro do carro, estacionado em garagem.", "Chevrolet Onix", "JKL-7H89", "Shopping Eldorado, São Paulo – SP"),
            new CenarioDeChamado("Manutenção", "Crítica", "Falha nos freios, veículo sem condições de rodar e necessário hoje.", "Mercedes Actros 2651", "MNB-2C34", "Unidade Campinas – SP"),
            new CenarioDeChamado("Manutenção", "Média", "Luz da injeção acesa no painel, veículo rodando com limitação.", "Renault Kwid", "ZXC-5V67", "Unidade Aeroporto de Confins – MG"),
            new CenarioDeChamado("Logística", "Alta", "Falta de veículo disponível para reserva confirmada, cliente no balcão.", "", "", "Unidade Rodoviária do Tietê – SP"),
            new CenarioDeChamado("Logística", "Baixa", "Agendar transferência de dois veículos entre unidades.", "", "", "Unidade Curitiba – PR"),
            new CenarioDeChamado("Tecnologia", "Crítica", "Sistema de locação fora do ar com fila de clientes no balcão.", "", "", "Unidade Aeroporto de Guarulhos – SP"),
            new CenarioDeChamado("Tecnologia", "Baixa", "Solicitação de reset de senha para atendente da unidade.", "", "", "Unidade Porto Alegre – RS"),
            new CenarioDeChamado("Financeiro", "Alta", "Cobrança indevida bloqueou o cartão do cliente na retirada.", "", "", ""),
            new CenarioDeChamado("Financeiro", "Baixa", "Solicitação de 2ª via de boleto da fatura de frota.", "", "", ""),
            new CenarioDeChamado("Contratos", "Crítica", "Bloqueio contratual impede a retirada imediata do veículo.", "Toyota Corolla", "PLM-8K90", "Unidade Belo Horizonte – MG"),
            new CenarioDeChamado("Contratos", "Média", "Renovação de contrato que vence nesta semana.", "", "", "")
    );

    private DadosDeExemplo() {
    }
}
