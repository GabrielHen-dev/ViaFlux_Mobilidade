package br.com.viaflux.api.devtools;

import br.com.viaflux.api.devtools.DadosDeExemplo.CenarioDeChamado;
import br.com.viaflux.api.devtools.DadosDeExemplo.OrganizacaoDeExemplo;
import br.com.viaflux.api.devtools.DadosDeExemplo.UsuarioDeExemplo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@ConditionalOnProperty(prefix = "viaflux.dev-tools", name = "habilitado", havingValue = "true")
@EnableConfigurationProperties(DevToolsProperties.class)
class PopuladorDeDados {

    private static final Logger log = LoggerFactory.getLogger(PopuladorDeDados.class);
    private static final String FILTRO_DOS_EMAILS = "%" + DadosDeExemplo.DOMINIO_DOS_EMAILS;
    private static final int JANELA_DE_ABERTURA_EM_MINUTOS = 5 * 24 * 60;
    private static final int ABERTURAS_RECENTES_A_CADA = 4;
    private static final int JANELA_RECENTE_EM_MINUTOS = 12;
    private static final List<String> STATUS_EM_ORDEM_DE_FREQUENCIA = List.of(
            "ABERTO", "EM_ATENDIMENTO", "ABERTO", "EM_TRIAGEM", "EM_ATENDIMENTO",
            "ABERTO", "AGUARDANDO", "RESOLVIDO", "EM_ATENDIMENTO", "FECHADO"
    );

    record ResultadoDoSeed(int organizacoesCriadas, int usuariosCriados, int chamadosCriados, List<String> protocolos) {
    }

    record ResultadoDaLimpeza(int chamadosRemovidos, int usuariosRemovidos, int organizacoesRemovidas) {
    }

    record UsuarioDeExemploResponse(
            String nome,
            String email,
            List<String> perfis,
            String organizacao,
            List<String> departamentos,
            boolean cadastrado
    ) {
    }

    record EstadoDosDados(
            long totalDeChamados,
            long chamadosDeExemplo,
            boolean senhaConfigurada,
            List<UsuarioDeExemploResponse> usuarios
    ) {
    }

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final DevToolsProperties propriedades;

    PopuladorDeDados(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, DevToolsProperties propriedades) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.propriedades = propriedades;
        log.warn("Dev tools habilitado: os endpoints /api/dev/** criam e apagam dados. Não habilite em produção.");
    }

    EstadoDosDados estado() {
        List<String> cadastrados = jdbc.queryForList("SELECT email FROM viaflux.usuario WHERE email LIKE ?", String.class, FILTRO_DOS_EMAILS);
        List<UsuarioDeExemploResponse> usuarios = DadosDeExemplo.USUARIOS.stream()
                .map(usuario -> new UsuarioDeExemploResponse(
                        usuario.nome(), usuario.email(), usuario.perfis(), usuario.organizacao(), usuario.departamentos(),
                        cadastrados.contains(usuario.email())
                ))
                .toList();
        return new EstadoDosDados(
                contar("SELECT count(*) FROM viaflux.chamados"),
                contar("SELECT count(*) FROM viaflux.chamados c JOIN viaflux.usuario u ON u.id = c.solicitante_id WHERE u.email LIKE ?", FILTRO_DOS_EMAILS),
                propriedades.senhaConfigurada(),
                usuarios
        );
    }

    @Transactional
    ResultadoDoSeed popular(int quantidadeDeChamados) {
        if (!propriedades.senhaConfigurada()) {
            throw new DevToolsIndisponivelException("Defina DEV_TOOLS_SENHA em infra/.env e reinicie a API para criar os usuários de exemplo.");
        }
        Map<String, UUID> organizacoes = new HashMap<>();
        int organizacoesCriadas = 0;
        for (OrganizacaoDeExemplo organizacao : DadosDeExemplo.ORGANIZACOES) {
            List<UUID> existentes = jdbc.queryForList("SELECT id FROM viaflux.organizacao WHERE nome = ? AND tipo = ?", UUID.class, organizacao.nome(), organizacao.tipo());
            if (existentes.isEmpty()) {
                organizacoes.put(organizacao.nome(), jdbc.queryForObject(
                        "INSERT INTO viaflux.organizacao (nome, tipo) VALUES (?, ?) RETURNING id", UUID.class, organizacao.nome(), organizacao.tipo()));
                organizacoesCriadas++;
            } else {
                organizacoes.put(organizacao.nome(), existentes.getFirst());
            }
        }

        String senhaCriptografada = passwordEncoder.encode(propriedades.senhaDosUsuarios());
        List<UsuarioCadastrado> solicitantes = new ArrayList<>();
        int usuariosCriados = 0;
        for (UsuarioDeExemplo usuario : DadosDeExemplo.USUARIOS) {
            List<UUID> existentes = jdbc.queryForList("SELECT id FROM viaflux.usuario WHERE email = ?", UUID.class, usuario.email());
            UUID id = existentes.isEmpty() ? cadastrar(usuario, senhaCriptografada, organizacoes) : existentes.getFirst();
            if (existentes.isEmpty()) {
                usuariosCriados++;
            }
            if (usuario.abreChamados()) {
                solicitantes.add(new UsuarioCadastrado(id, usuario.organizacao() == null ? usuario.nome() : usuario.organizacao()));
            }
        }

        List<String> protocolos = new ArrayList<>();
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS);
        for (int indice = 0; indice < quantidadeDeChamados; indice++) {
            CenarioDeChamado cenario = DadosDeExemplo.CENARIOS.get(indice % DadosDeExemplo.CENARIOS.size());
            UsuarioCadastrado solicitante = solicitantes.get(indice % solicitantes.size());
            String status = STATUS_EM_ORDEM_DE_FREQUENCIA.get(indice % STATUS_EM_ORDEM_DE_FREQUENCIA.size());
            protocolos.add(criarChamado(cenario, solicitante, status, aberturaDoChamado(indice, agora), agora));
        }
        log.info("Dev tools: {} organizações, {} usuários e {} chamados de exemplo criados.", organizacoesCriadas, usuariosCriados, protocolos.size());
        return new ResultadoDoSeed(organizacoesCriadas, usuariosCriados, protocolos.size(), protocolos);
    }

    @Transactional
    ResultadoDaLimpeza limpar() {
        int chamados = jdbc.update(
                "DELETE FROM viaflux.chamados WHERE solicitante_id IN (SELECT id FROM viaflux.usuario WHERE email LIKE ?)", FILTRO_DOS_EMAILS);
        int usuarios = jdbc.update("DELETE FROM viaflux.usuario WHERE email LIKE ?", FILTRO_DOS_EMAILS);
        int organizacoes = 0;
        for (OrganizacaoDeExemplo organizacao : DadosDeExemplo.ORGANIZACOES) {
            organizacoes += jdbc.update("""
                    DELETE FROM viaflux.organizacao o
                    WHERE o.nome = ? AND o.tipo = ?
                      AND NOT EXISTS (SELECT 1 FROM viaflux.usuario u WHERE u.organizacao_id = o.id)
                    """, organizacao.nome(), organizacao.tipo());
        }
        log.info("Dev tools: {} chamados, {} usuários e {} organizações de exemplo removidos.", chamados, usuarios, organizacoes);
        return new ResultadoDaLimpeza(chamados, usuarios, organizacoes);
    }

    private record UsuarioCadastrado(UUID id, String nomeDoCliente) {
    }

    private long contar(String sql, Object... parametros) {
        Long total = jdbc.queryForObject(sql, Long.class, parametros);
        return total == null ? 0 : total;
    }

    private UUID cadastrar(UsuarioDeExemplo usuario, String senhaCriptografada, Map<String, UUID> organizacoes) {
        UUID id = jdbc.queryForObject(
                "INSERT INTO viaflux.usuario (nome, email, senha_hash, organizacao_id) VALUES (?, ?, ?, ?) RETURNING id",
                UUID.class, usuario.nome(), usuario.email(), senhaCriptografada,
                usuario.organizacao() == null ? null : organizacoes.get(usuario.organizacao()));
        for (String perfil : usuario.perfis()) {
            jdbc.update("INSERT INTO viaflux.usuario_perfil (usuario_id, perfil_codigo) VALUES (?, ?)", id, perfil);
        }
        for (String departamento : usuario.departamentos()) {
            jdbc.update("INSERT INTO viaflux.usuario_departamento (usuario_id, departamento_codigo) VALUES (?, ?)", id, departamento);
        }
        return id;
    }

    private static OffsetDateTime aberturaDoChamado(int indice, OffsetDateTime agora) {
        ThreadLocalRandom aleatorio = ThreadLocalRandom.current();
        boolean recente = indice % ABERTURAS_RECENTES_A_CADA == 0;
        int minutosAtras = recente ? aleatorio.nextInt(1, JANELA_RECENTE_EM_MINUTOS) : aleatorio.nextInt(30, JANELA_DE_ABERTURA_EM_MINUTOS);
        return agora.minusMinutes(minutosAtras);
    }

    private String criarChamado(CenarioDeChamado cenario, UsuarioCadastrado solicitante, String status, OffsetDateTime abertura, OffsetDateTime agora) {
        Long numero = jdbc.queryForObject("SELECT nextval('viaflux.chamados_numero_seq')", Long.class);
        String codigo = String.format(Locale.ROOT, "VF-%04d", numero);
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO viaflux.chamados
                    (id, codigo, cliente, telefone, modelo, placa, tipo, prioridade, descricao, localizacao, status, aberto_em, solicitante_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, codigo, solicitante.nomeDoCliente(), "(11) 90000-0000", cenario.modelo(), cenario.placa(), cenario.tipo(),
                cenario.prioridade(), cenario.descricao(), cenario.localizacao(), status, abertura, solicitante.id());

        List<EventoDeExemplo> eventos = new ArrayList<>();
        eventos.add(new EventoDeExemplo("Chamado aberto", "Chamado registrado pelo portal ViaFlux.", "aberto", 0));
        if (!status.equals("ABERTO")) {
            eventos.add(new EventoDeExemplo("Triagem iniciada", "Classificação revisada pela Central.", "triagem", 5));
        }
        if (List.of("EM_ATENDIMENTO", "AGUARDANDO", "RESOLVIDO", "FECHADO").contains(status)) {
            eventos.add(new EventoDeExemplo("Atendimento iniciado", "Chamado assumido pela equipe responsável.", "atendimento", 9));
        }
        if (status.equals("AGUARDANDO")) {
            eventos.add(new EventoDeExemplo("Aguardando cliente", "Solicitadas fotos do painel ao cliente.", "atualizacao", 20));
        }
        if (status.equals("RESOLVIDO") || status.equals("FECHADO")) {
            eventos.add(new EventoDeExemplo("Chamado resolvido", "Atendimento concluído pela equipe responsável.", "atualizacao", 25));
        }
        if (status.equals("FECHADO")) {
            eventos.add(new EventoDeExemplo("Chamado fechado", "Solução validada com o cliente.", "atualizacao", 30));
        }
        long minutosDesdeAbertura = ChronoUnit.MINUTES.between(abertura, agora);
        for (EventoDeExemplo evento : eventos) {
            long deslocamento = Math.min(evento.minutosAposAbertura(), Math.max(0, minutosDesdeAbertura));
            jdbc.update(
                    "INSERT INTO viaflux.chamado_evento (id, chamado_id, acao, detalhe, icone, ocorrido_em) VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), id, evento.acao(), evento.detalhe(), evento.icone(), abertura.plusMinutes(deslocamento));
        }
        return codigo;
    }

    private record EventoDeExemplo(String acao, String detalhe, String icone, int minutosAposAbertura) {
    }
}
