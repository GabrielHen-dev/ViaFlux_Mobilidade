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
            boolean temLocal
    ) {
    }

    record LocalDeExemplo(String logradouro, String bairro, String cidade, String uf, double latitude, double longitude) {

        String descricao() {
            return logradouro + " · " + bairro + " · " + cidade + " – " + uf;
        }
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
            new CenarioDeChamado("M-ASSISTENCIA_24H-1", "C-ASSISTENCIA_24H-1", "Veículo não liga e está parado no acostamento da rodovia.", "Volvo FH 460", "RTA-1D23", true),
            new CenarioDeChamado("M-ASSISTENCIA_24H-4", "C-ASSISTENCIA_24H-2", "Pneu furado com motorista aguardando socorro na rua.", "Fiat Strada", "QWE-4F56", true),
            new CenarioDeChamado("M-ASSISTENCIA_24H-5", "C-ASSISTENCIA_24H-4", "Chave trancada dentro do carro, estacionado em garagem.", "Chevrolet Onix", "JKL-7H89", true),
            new CenarioDeChamado("M-MANUTENCAO-1", "C-MANUTENCAO-1", "Falha nos freios, veículo sem condições de rodar e necessário hoje.", "Mercedes Actros 2651", "MNB-2C34", true),
            new CenarioDeChamado("M-MANUTENCAO-3", "C-MANUTENCAO-3", "Luz da injeção acesa no painel, veículo rodando com limitação.", "Renault Kwid", "ZXC-5V67", true),
            new CenarioDeChamado("M-LOGISTICA-2", "C-LOGISTICA-1", "Falta de veículo disponível para reserva confirmada, cliente no balcão.", "", "", true),
            new CenarioDeChamado("M-LOGISTICA-5", "C-LOGISTICA-4", "Agendar transferência de dois veículos entre unidades.", "", "", true),
            new CenarioDeChamado("M-TI-1", "C-TI-1", "Sistema de locação fora do ar com fila de clientes no balcão.", "", "", true),
            new CenarioDeChamado("M-TI-5", "C-TI-5", "Solicitação de reset de senha para atendente da unidade.", "", "", true),
            new CenarioDeChamado("M-FINANCEIRO-1", "C-FINANCEIRO-1", "Cobrança indevida bloqueou o cartão do cliente na retirada.", "", "", false),
            new CenarioDeChamado("M-FINANCEIRO-4", "C-FINANCEIRO-5", "Solicitação de 2ª via de boleto da fatura de frota.", "", "", false),
            new CenarioDeChamado("M-CONTRATOS-1", "C-CONTRATOS-1", "Bloqueio contratual impede a retirada imediata do veículo.", "Toyota Corolla", "PLM-8K90", true),
            new CenarioDeChamado("M-CONTRATOS-2", "C-CONTRATOS-3", "Renovação de contrato que vence nesta semana.", "", "", false)
    );

    static final List<LocalDeExemplo> LOCAIS = List.of(
            new LocalDeExemplo("Av. Boa Viagem", "Boa Viagem", "Recife", "PE", -8.1196, -34.9006),
            new LocalDeExemplo("Av. Agamenon Magalhães", "Derby", "Recife", "PE", -8.0556, -34.8990),
            new LocalDeExemplo("Rua do Bom Jesus", "Recife Antigo", "Recife", "PE", -8.0631, -34.8711),
            new LocalDeExemplo("Av. Caxangá", "Cordeiro", "Recife", "PE", -8.0490, -34.9300),
            new LocalDeExemplo("BR-101, Curado", "Curado", "Recife", "PE", -8.0760, -34.9720),
            new LocalDeExemplo("Av. Mascarenhas de Moraes", "Imbiribeira", "Recife", "PE", -8.1080, -34.9150),
            new LocalDeExemplo("Av. Bernardo Vieira de Melo", "Piedade", "Jaboatão dos Guararapes", "PE", -8.1690, -34.9157),
            new LocalDeExemplo("Estrada da Batalha", "Prazeres", "Jaboatão dos Guararapes", "PE", -8.1700, -34.9350),
            new LocalDeExemplo("BR-232, km 8", "Jardim Jordão", "Jaboatão dos Guararapes", "PE", -8.1150, -34.9800),
            new LocalDeExemplo("Av. Presidente Getúlio Vargas", "Centro", "Cabo de Santo Agostinho", "PE", -8.2870, -35.0350),
            new LocalDeExemplo("Complexo Portuário de Suape", "Suape", "Cabo de Santo Agostinho", "PE", -8.3940, -34.9750),
            new LocalDeExemplo("PE-060, Gaibu", "Gaibu", "Cabo de Santo Agostinho", "PE", -8.3330, -34.9530),
            new LocalDeExemplo("BR-101 Norte, km 40", "Centro", "Igarassu", "PE", -7.8340, -34.9060),
            new LocalDeExemplo("Av. Getúlio Vargas", "Bairro Novo", "Olinda", "PE", -8.0089, -34.8553),
            new LocalDeExemplo("PE-001", "Janga", "Paulista", "PE", -7.9400, -34.8300),
            new LocalDeExemplo("Av. Belmino Correia", "Timbi", "Camaragibe", "PE", -8.0215, -34.9810),
            new LocalDeExemplo("BR-232, km 130", "Indianópolis", "Caruaru", "PE", -8.2836, -35.9761),
            new LocalDeExemplo("Av. Engenheiro Roberto Freire", "Ponta Negra", "Natal", "RN", -5.8826, -35.1660),
            new LocalDeExemplo("Av. Prudente de Morais", "Lagoa Nova", "Natal", "RN", -5.8270, -35.2140),
            new LocalDeExemplo("Av. Salgado Filho", "Tirol", "Natal", "RN", -5.8000, -35.2060),
            new LocalDeExemplo("BR-101, Aeroporto", "Emaús", "Parnamirim", "RN", -5.9156, -35.2628),
            new LocalDeExemplo("Av. Presidente Dutra", "Alto de São Manoel", "Mossoró", "RN", -5.1880, -37.3440),
            new LocalDeExemplo("Av. Epitácio Pessoa", "Tambaú", "João Pessoa", "PB", -7.1195, -34.8450),
            new LocalDeExemplo("Av. Floriano Peixoto", "Centro", "Campina Grande", "PB", -7.2307, -35.8811),
            new LocalDeExemplo("Av. Fernandes Lima", "Farol", "Maceió", "AL", -9.6458, -35.7253),
            new LocalDeExemplo("Av. Beira Mar", "Meireles", "Fortaleza", "CE", -3.7250, -38.4970),
            new LocalDeExemplo("Av. Tancredo Neves", "Caminho das Árvores", "Salvador", "BA", -12.9820, -38.4560),
            new LocalDeExemplo("Eixo Monumental", "Zona Cívico-Administrativa", "Brasília", "DF", -15.7939, -47.8828),
            new LocalDeExemplo("Av. Afonso Pena", "Centro", "Belo Horizonte", "MG", -19.9167, -43.9345),
            new LocalDeExemplo("Av. Paulista", "Bela Vista", "São Paulo", "SP", -23.5614, -46.6559),
            new LocalDeExemplo("Rod. Presidente Dutra, km 225", "Cumbica", "Guarulhos", "SP", -23.4543, -46.5337),
            new LocalDeExemplo("Rua XV de Novembro", "Centro", "Curitiba", "PR", -25.4284, -49.2733),
            new LocalDeExemplo("Av. Ipiranga", "Azenha", "Porto Alegre", "RS", -30.0450, -51.2100)
    );

    private DadosDeExemplo() {
    }
}
