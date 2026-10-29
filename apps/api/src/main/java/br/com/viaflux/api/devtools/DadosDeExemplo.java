package br.com.viaflux.api.devtools;

import java.util.List;

final class DadosDeExemplo {

    static final String DOMINIO_DOS_EMAILS = "@seed.viaflux.local";

    record OrganizacaoDeExemplo(String nome, String tipo, String especialidade) {
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
            String motivoId,
            String contextoId,
            String descricao,
            String modelo,
            String placa,
            String localizacao
    ) {
    }

    static final List<OrganizacaoDeExemplo> ORGANIZACOES = List.of(
            new OrganizacaoDeExemplo("Transportes Sul Ltda", "CLIENTE", null),
            new OrganizacaoDeExemplo("Norte Frotas Locações", "CLIENTE", null),
            new OrganizacaoDeExemplo("Guincho ViaRápido", "FORNECEDOR", "Guincho / Remoção"),
            new OrganizacaoDeExemplo("Oficina TechTruck", "FORNECEDOR", "Mecânica"),
            new OrganizacaoDeExemplo("Chaveiro Express", "FORNECEDOR", "Chaveiro")
    );

    static final List<UsuarioDeExemplo> USUARIOS = List.of(
            new UsuarioDeExemplo("Ana Ribeiro", "cliente.ana" + DOMINIO_DOS_EMAILS, List.of("CLIENTE"), null, List.of(), true),
            new UsuarioDeExemplo("Bruno Lima", "cliente.bruno" + DOMINIO_DOS_EMAILS, List.of("CLIENTE"), null, List.of(), true),
            new UsuarioDeExemplo("Carla Mendes", "cliente.carla" + DOMINIO_DOS_EMAILS, List.of("CLIENTE"), null, List.of(), true),
            new UsuarioDeExemplo("Gestão de Frota Transportes Sul", "gestor.frota" + DOMINIO_DOS_EMAILS, List.of("GESTOR_FROTA"), "Transportes Sul Ltda", List.of(), true),
            new UsuarioDeExemplo("Gestão de Frota Norte Frotas", "gestor.norte" + DOMINIO_DOS_EMAILS, List.of("GESTOR_FROTA"), "Norte Frotas Locações", List.of(), true),
            new UsuarioDeExemplo("Paula Atendente", "atendente" + DOMINIO_DOS_EMAILS, List.of("ATENDENTE"), null, List.of(), false),
            new UsuarioDeExemplo("João Atendente", "atendente.joao" + DOMINIO_DOS_EMAILS, List.of("ATENDENTE"), null, List.of(), false),
            new UsuarioDeExemplo("Diego Assistência", "assistencia" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("ASSISTENCIA_24H"), false),
            new UsuarioDeExemplo("Marina Manutenção", "manutencao" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("MANUTENCAO"), false),
            new UsuarioDeExemplo("Lucas Logística", "logistica" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("LOGISTICA"), false),
            new UsuarioDeExemplo("Tiago Tecnologia", "ti" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("TI"), false),
            new UsuarioDeExemplo("Fernanda Financeiro", "financeiro" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("FINANCEIRO"), false),
            new UsuarioDeExemplo("Carlos Contratos", "contratos" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("CONTRATOS"), false),
            new UsuarioDeExemplo("Renata Operações", "operacoes" + DOMINIO_DOS_EMAILS, List.of("DEPARTAMENTO"), null, List.of("MANUTENCAO", "LOGISTICA"), false),
            new UsuarioDeExemplo("Lúcia Líder", "lider" + DOMINIO_DOS_EMAILS, List.of("LIDER_OPERACIONAL"), null, List.of(), false),
            new UsuarioDeExemplo("Helena Coordenação", "coordenacao" + DOMINIO_DOS_EMAILS, List.of("ATENDENTE", "LIDER_OPERACIONAL"), null, List.of(), false),
            new UsuarioDeExemplo("Guincho ViaRápido", "guincho" + DOMINIO_DOS_EMAILS, List.of("FORNECEDOR"), "Guincho ViaRápido", List.of(), false),
            new UsuarioDeExemplo("Oficina TechTruck", "oficina" + DOMINIO_DOS_EMAILS, List.of("FORNECEDOR"), "Oficina TechTruck", List.of(), false),
            new UsuarioDeExemplo("Chaveiro Express", "chaveiro" + DOMINIO_DOS_EMAILS, List.of("FORNECEDOR"), "Chaveiro Express", List.of(), false)
    );

    static final List<CenarioDeChamado> CENARIOS = List.of(
            new CenarioDeChamado("M-ASSISTENCIA_24H-1", "C-ASSISTENCIA_24H-1", "Veículo não liga e está parado no acostamento da rodovia.", "Volvo FH 460", "RTA-1D23", "BR-116, km 312, Guarulhos – SP"),
            new CenarioDeChamado("M-ASSISTENCIA_24H-4", "C-ASSISTENCIA_24H-2", "Pneu furado com motorista aguardando socorro na rua.", "Fiat Strada", "QWE-4F56", "Av. Paulista, 1500, São Paulo – SP"),
            new CenarioDeChamado("M-ASSISTENCIA_24H-5", "C-ASSISTENCIA_24H-4", "Chave trancada dentro do carro, estacionado em garagem.", "Chevrolet Onix", "JKL-7H89", "Shopping Eldorado, São Paulo – SP"),
            new CenarioDeChamado("M-MANUTENCAO-1", "C-MANUTENCAO-1", "Falha nos freios, veículo sem condições de rodar e necessário hoje.", "Mercedes Actros 2651", "MNB-2C34", "Unidade Campinas – SP"),
            new CenarioDeChamado("M-MANUTENCAO-3", "C-MANUTENCAO-3", "Luz da injeção acesa no painel, veículo rodando com limitação.", "Renault Kwid", "ZXC-5V67", "Unidade Aeroporto de Confins – MG"),
            new CenarioDeChamado("M-LOGISTICA-2", "C-LOGISTICA-1", "Falta de veículo disponível para reserva confirmada, cliente no balcão.", "", "", "Unidade Rodoviária do Tietê – SP"),
            new CenarioDeChamado("M-LOGISTICA-5", "C-LOGISTICA-4", "Agendar transferência de dois veículos entre unidades.", "", "", "Unidade Curitiba – PR"),
            new CenarioDeChamado("M-TI-1", "C-TI-1", "Sistema de locação fora do ar com fila de clientes no balcão.", "", "", "Unidade Aeroporto de Guarulhos – SP"),
            new CenarioDeChamado("M-TI-5", "C-TI-5", "Solicitação de reset de senha para atendente da unidade.", "", "", "Unidade Porto Alegre – RS"),
            new CenarioDeChamado("M-FINANCEIRO-1", "C-FINANCEIRO-1", "Cobrança indevida bloqueou o cartão do cliente na retirada.", "", "", ""),
            new CenarioDeChamado("M-FINANCEIRO-4", "C-FINANCEIRO-5", "Solicitação de 2ª via de boleto da fatura de frota.", "", "", ""),
            new CenarioDeChamado("M-CONTRATOS-1", "C-CONTRATOS-1", "Bloqueio contratual impede a retirada imediata do veículo.", "Toyota Corolla", "PLM-8K90", "Unidade Belo Horizonte – MG"),
            new CenarioDeChamado("M-CONTRATOS-2", "C-CONTRATOS-3", "Renovação de contrato que vence nesta semana.", "", "", "")
    );

    private DadosDeExemplo() {
    }
}
