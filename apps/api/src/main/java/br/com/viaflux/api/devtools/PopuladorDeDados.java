package br.com.viaflux.api.devtools;

import br.com.viaflux.api.chamado.TipoChamado;
import br.com.viaflux.api.devtools.DadosDeExemplo.CenarioDeChamado;
import br.com.viaflux.api.devtools.DadosDeExemplo.OrganizacaoDeExemplo;
import br.com.viaflux.api.devtools.DadosDeExemplo.UsuarioDeExemplo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Objects;
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
            "ABERTO", "EM_ATENDIMENTO", "NA_FILA", "EM_TRIAGEM", "ABERTO",
            "EM_ATENDIMENTO", "AGUARDANDO", "NA_FILA", "RESOLVIDO", "FECHADO"
    );
    private static final List<String> STATUS_ANTES_DA_TRIAGEM = List.of("ABERTO", "EM_TRIAGEM");
    private static final int JANELA_DA_FILA_DE_TRIAGEM_EM_MINUTOS = 45;
    private static final int HORIZONTE_DO_HISTORICO_EM_MINUTOS = 30;
    private static final String AUTOR_SISTEMA = "Sistema";
    private static final String ATENDENTE_DE_EXEMPLO = "Paula Atendente";
    private static final String EMAIL_DO_ATENDENTE_DE_EXEMPLO = "atendente" + DadosDeExemplo.DOMINIO_DOS_EMAILS;

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
    private final int prazoUrgenciaAlta;
    private final int prazoUrgenciaMedia;
    private final int prazoUrgenciaBaixa;

    PopuladorDeDados(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            DevToolsProperties propriedades,
            @Value("${viaflux.triagem.urgencia-alta-minutos:10}") int prazoUrgenciaAlta,
            @Value("${viaflux.triagem.urgencia-media-minutos:20}") int prazoUrgenciaMedia,
            @Value("${viaflux.triagem.urgencia-baixa-minutos:40}") int prazoUrgenciaBaixa
    ) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.propriedades = propriedades;
        this.prazoUrgenciaAlta = prazoUrgenciaAlta;
        this.prazoUrgenciaMedia = prazoUrgenciaMedia;
        this.prazoUrgenciaBaixa = prazoUrgenciaBaixa;
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
                        "INSERT INTO viaflux.organizacao (nome, tipo, especialidade) VALUES (?, ?, ?) RETURNING id",
                        UUID.class, organizacao.nome(), organizacao.tipo(), organizacao.especialidade()));
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

        UUID atendenteId = jdbc.queryForObject("SELECT id FROM viaflux.usuario WHERE email = ?", UUID.class, EMAIL_DO_ATENDENTE_DE_EXEMPLO);
        List<String> protocolos = new ArrayList<>();
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.SECONDS);
        for (int indice = 0; indice < quantidadeDeChamados; indice++) {
            CenarioDeChamado cenario = DadosDeExemplo.CENARIOS.get(indice % DadosDeExemplo.CENARIOS.size());
            UsuarioCadastrado solicitante = solicitantes.get(indice % solicitantes.size());
            String status = STATUS_EM_ORDEM_DE_FREQUENCIA.get(indice % STATUS_EM_ORDEM_DE_FREQUENCIA.size());
            OffsetDateTime abertura = STATUS_ANTES_DA_TRIAGEM.contains(status)
                    ? agora.minusMinutes(ThreadLocalRandom.current().nextInt(1, JANELA_DA_FILA_DE_TRIAGEM_EM_MINUTOS))
                    : aberturaDoChamado(indice, agora);
            protocolos.add(criarChamado(cenario, solicitante, atendenteId, status, abertura, agora));
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

    private String criarChamado(CenarioDeChamado cenario, UsuarioCadastrado solicitante, UUID atendenteId, String status, OffsetDateTime abertura, OffsetDateTime agora) {
        Long numero = jdbc.queryForObject("SELECT nextval('viaflux.chamados_numero_seq')", Long.class);
        String codigo = String.format(Locale.ROOT, "VF-%04d", numero);
        UUID id = UUID.randomUUID();
        Integer urgenciaDeclarada = jdbc.queryForObject("SELECT urgencia FROM viaflux.contexto WHERE id = ?", Integer.class, cenario.contextoId());
        int prazoDeTriagem = prazoDeTriagem(urgenciaDeclarada);
        boolean triado = !STATUS_ANTES_DA_TRIAGEM.contains(status);
        boolean triagemIniciada = triado || status.equals("EM_TRIAGEM");
        long minutosDesdeAbertura = ChronoUnit.MINUTES.between(abertura, agora);
        OffsetDateTime triadoEm = triado ? depoisDaAbertura(abertura, 5, minutosDesdeAbertura) : null;
        OffsetDateTime primeiraResposta = triado && !status.equals("NA_FILA") ? depoisDaAbertura(abertura, 9, minutosDesdeAbertura) : null;
        OffsetDateTime resolvidoEm = status.equals("RESOLVIDO") || status.equals("FECHADO") ? depoisDaAbertura(abertura, 25, minutosDesdeAbertura) : null;
        jdbc.update("""
                INSERT INTO viaflux.chamados
                    (id, codigo, cliente, telefone, modelo, placa, descricao, localizacao, status, aberto_em, atualizado_em, solicitante_id,
                     motivo_id, contexto_id, tipo_declarado, urgencia_declarada, triagem_prazo_minutos, triagem_limite,
                     triagem_iniciada_em, triagem_responsavel_id, triagem_responsavel_nome, classificacao_tipo, severidade, urgencia, departamento_codigo,
                     triado_em, triado_por_id, triado_por_nome, primeira_resposta_em, resolvido_em, motivo_aguardando)
                SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                       m.id, c.id, m.tipo, c.urgencia, ?, ?,
                       ?, ?, ?, CASE WHEN ? THEN m.tipo END, CASE WHEN ? THEN m.severidade END, CASE WHEN ? THEN c.urgencia END,
                       CASE WHEN ? THEN m.tipo END, ?, ?, ?, ?, ?, ?
                FROM viaflux.motivo m, viaflux.contexto c
                WHERE m.id = ? AND c.id = ?
                """,
                id, codigo, solicitante.nomeDoCliente(), "(11) 90000-0000", cenario.modelo().isBlank() ? "Não se aplica" : cenario.modelo(),
                cenario.placa(), cenario.descricao(), cenario.localizacao(), status, abertura, agora, solicitante.id(),
                prazoDeTriagem, abertura.plusMinutes(prazoDeTriagem),
                triagemIniciada ? depoisDaAbertura(abertura, 2, minutosDesdeAbertura) : null,
                triagemIniciada ? atendenteId : null,
                triagemIniciada ? ATENDENTE_DE_EXEMPLO : null,
                triado, triado, triado, triado,
                triadoEm, triado ? atendenteId : null, triado ? ATENDENTE_DE_EXEMPLO : null, primeiraResposta, resolvidoEm,
                status.equals("AGUARDANDO") ? "FORNECEDOR" : null,
                cenario.motivoId(), cenario.contextoId());
        if (primeiraResposta != null) {
            jdbc.update("""
                    UPDATE viaflux.chamados c
                    SET atendimento_responsavel_id = u.id, atendimento_responsavel_nome = u.nome, atendimento_assumido_em = c.primeira_resposta_em
                    FROM viaflux.usuario u
                    JOIN viaflux.usuario_departamento ud ON ud.usuario_id = u.id
                    WHERE c.id = ? AND ud.departamento_codigo = c.departamento_codigo AND u.email LIKE ?
                    """, id, FILTRO_DOS_EMAILS);
        }

        String departamento = TipoChamado.valueOf(
                jdbc.queryForObject("SELECT tipo FROM viaflux.motivo WHERE id = ?", String.class, cenario.motivoId())).getNome();
        String responsavel = jdbc.queryForList("SELECT atendimento_responsavel_nome FROM viaflux.chamados WHERE id = ?", String.class, id)
                .stream()
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Equipe " + departamento);

        List<EventoDeExemplo> eventos = new ArrayList<>();
        eventos.add(new EventoDeExemplo("ABERTURA", "Chamado aberto", "Chamado registrado pelo portal ViaFlux.", true, 0, solicitante.nomeDoCliente()));
        eventos.add(new EventoDeExemplo("TRIAGEM", "Aguardando triagem",
                "Um atendente vai analisar a solicitação em até " + prazoDeTriagem + " minutos.", true, 0, AUTOR_SISTEMA));
        if (triagemIniciada) {
            eventos.add(new EventoDeExemplo("TRIAGEM", "Triagem iniciada", "Triagem assumida por " + ATENDENTE_DE_EXEMPLO + ".", true, 2, ATENDENTE_DE_EXEMPLO));
        }
        if (triado) {
            eventos.add(new EventoDeExemplo("CLASSIFICACAO", "Triagem concluída", "Classificação definida pelo atendente na triagem.", false, 5, ATENDENTE_DE_EXEMPLO));
            eventos.add(new EventoDeExemplo("ROTEAMENTO", "Encaminhado para " + departamento,
                    "Chamado direcionado para a fila de " + departamento + ".", true, 5, ATENDENTE_DE_EXEMPLO));
        }
        if (primeiraResposta != null) {
            eventos.add(new EventoDeExemplo("STATUS", "Status alterado para Em atendimento", "Na fila → Em atendimento · assumido por " + responsavel, true, 9, responsavel));
        }
        if (status.equals("AGUARDANDO")) {
            eventos.add(new EventoDeExemplo("STATUS", "Status alterado para Aguardando", "Em atendimento → Aguardando · aguardando fornecedor", true, 20, responsavel));
        }
        if (resolvidoEm != null) {
            eventos.add(new EventoDeExemplo("STATUS", "Status alterado para Resolvido", "Em atendimento → Resolvido", true, 25, responsavel));
        }
        if (status.equals("FECHADO")) {
            eventos.add(new EventoDeExemplo("STATUS", "Status alterado para Fechado", "Resolvido → Fechado · solução validada com o cliente", true, 30, responsavel));
        }
        for (EventoDeExemplo evento : eventos) {
            jdbc.update(
                    "INSERT INTO viaflux.chamado_evento (id, chamado_id, tipo, acao, detalhe, autor_nome, visivel_cliente, ocorrido_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), id, evento.tipo(), evento.acao(), evento.detalhe(), evento.autor(),
                    evento.visivelCliente(), depoisDaAbertura(abertura, evento.minutosAposAbertura(), minutosDesdeAbertura));
        }
        jdbc.update("""
                UPDATE viaflux.chamados
                SET atualizado_em = (SELECT MAX(ocorrido_em) FROM viaflux.chamado_evento WHERE chamado_id = ?)
                WHERE id = ?
                """, id, id);
        return codigo;
    }

    private static OffsetDateTime depoisDaAbertura(OffsetDateTime abertura, long minutos, long minutosDesdeAbertura) {
        long decorridos = Math.max(0, minutosDesdeAbertura);
        if (decorridos >= HORIZONTE_DO_HISTORICO_EM_MINUTOS) {
            return abertura.plusMinutes(minutos);
        }
        return abertura.plusSeconds(minutos * 60 * decorridos / HORIZONTE_DO_HISTORICO_EM_MINUTOS);
    }

    private int prazoDeTriagem(Integer urgencia) {
        if (urgencia == null) {
            return prazoUrgenciaMedia;
        }
        return switch (urgencia) {
            case 5 -> prazoUrgenciaAlta;
            case 1 -> prazoUrgenciaBaixa;
            default -> prazoUrgenciaMedia;
        };
    }

    private record EventoDeExemplo(String tipo, String acao, String detalhe, boolean visivelCliente, int minutosAposAbertura, String autor) {
    }
}
