package br.com.viaflux.api.chamado;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.usuario.DepartamentoRepository;
import br.com.viaflux.api.usuario.PerfilRepository;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

@SpringBootTest(properties = {"management.health.mail.enabled=false", "viaflux.chamados.alertas-sla.atraso-inicial=PT1H"})
@Testcontainers(disabledWithoutDocker = true)
class AlertasDeSlaIntegracaoTests {

    private static final String DEPARTAMENTO_DA_FILA = TipoChamado.MANUTENCAO.name();

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @MockitoBean
    private CaixaDeSaida caixaDeSaida;

    @Autowired
    private AlertasDeSlaService servico;

    @Autowired
    private ScheduledAnnotationBeanPostProcessor agendamentos;

    @Autowired
    private ChamadoRepository chamados;

    @Autowired
    private MotivoRepository motivos;

    @Autowired
    private ContextoRepository contextos;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private PerfilRepository perfis;

    @Autowired
    private DepartamentoRepository departamentos;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate transacao;

    private Usuario liderOperacional;
    private Usuario liderDoDepartamento;
    private Usuario membroDaEquipe;

    @BeforeEach
    void cadastrarEquipe() {
        jdbc.update("DELETE FROM viaflux.chamados");
        jdbc.update("DELETE FROM viaflux.usuario");
        given(caixaDeSaida.tentarEnviar(any())).willReturn(true);
        liderOperacional = cadastrarUsuario("Lia Líder", List.of(), "LIDER_OPERACIONAL");
        liderDoDepartamento = cadastrarUsuario("Débora Líder", List.of(DEPARTAMENTO_DA_FILA), "LIDER_DEPARTAMENTO");
        membroDaEquipe = cadastrarUsuario("Marina Equipe", List.of(DEPARTAMENTO_DA_FILA), "DEPARTAMENTO");
    }

    @Test
    void aRotinaFicaAgendadaAoSubirAAplicacao() {
        assertThat(agendamentos.getScheduledTasks())
                .extracting(tarefa -> tarefa.getTask().getRunnable().toString())
                .anyMatch(tarefa -> tarefa.contains("AgendaDeAlertasDeSla.verificarPrazos"));
    }

    @Test
    void disparaGravaHistoricoNotificaEEntregaUmaUnicaVez() {
        UUID chamadoId = cadastrarChamadoP2("SLA-0001", 25);

        servico.verificarPrazos();
        servico.verificarPrazos();

        assertThat(contar("SELECT COUNT(*) FROM viaflux.alerta_sla WHERE chamado_id = ?", chamadoId)).isEqualTo(2);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.notificacao WHERE chamado_id = ? AND destinatario_id = ?", chamadoId, liderOperacional.getId())).isEqualTo(1);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.notificacao WHERE chamado_id = ? AND destinatario_id = ?", chamadoId, liderDoDepartamento.getId())).isEqualTo(1);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.notificacao WHERE chamado_id = ? AND destinatario_id = ?", chamadoId, membroDaEquipe.getId())).isEqualTo(1);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.chamado_evento WHERE chamado_id = ? AND tipo = 'SLA' AND acao = 'Prazo de SLA em risco'", chamadoId)).isEqualTo(1);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.chamado_evento WHERE chamado_id = ? AND tipo = 'ESCALONAMENTO' AND visivel_cliente = FALSE", chamadoId)).isEqualTo(1);
        assertThat(contar("""
                SELECT COUNT(*) FROM viaflux.alerta_sla_entrega entrega JOIN viaflux.alerta_sla alerta ON alerta.id = entrega.alerta_id
                WHERE alerta.chamado_id = ? AND entrega.estado = 'ENTREGUE' AND entrega.tentativas = 1 AND entrega.entregue_em IS NOT NULL
                """, chamadoId)).isEqualTo(3);

        ArgumentCaptor<CaixaDeSaida.Mensagem> emails = ArgumentCaptor.forClass(CaixaDeSaida.Mensagem.class);
        verify(caixaDeSaida, atLeastOnce()).tentarEnviar(emails.capture());
        List<CaixaDeSaida.Mensagem> doChamado = emails.getAllValues().stream()
                .filter(email -> email.assunto().startsWith("Chamado SLA-0001:"))
                .toList();
        assertThat(doChamado).extracting(CaixaDeSaida.Mensagem::para)
                .containsExactlyInAnyOrder(liderOperacional.getEmail(), liderDoDepartamento.getEmail(), membroDaEquipe.getEmail());
    }

    @Test
    void falhaDeEmailFicaGravadaEOPortalNaoDependeDele() {
        given(caixaDeSaida.tentarEnviar(any())).willReturn(false);
        UUID chamadoId = cadastrarChamadoP2("SLA-0002", 15);

        servico.verificarPrazos();

        assertThat(contar("SELECT COUNT(*) FROM viaflux.notificacao WHERE chamado_id = ? AND destinatario_id = ?", chamadoId, membroDaEquipe.getId())).isEqualTo(1);
        assertThat(contar("""
                SELECT COUNT(*) FROM viaflux.alerta_sla_entrega entrega JOIN viaflux.alerta_sla alerta ON alerta.id = entrega.alerta_id
                WHERE alerta.chamado_id = ? AND entrega.estado = 'PENDENTE' AND entrega.tentativas = 1
                  AND entrega.ultima_falha_em IS NOT NULL AND entrega.proxima_tentativa_em > NOW()
                """, chamadoId)).isEqualTo(1);
        assertThat(contar("SELECT COUNT(*) FROM viaflux.chamado_evento WHERE chamado_id = ? AND acao = 'Falha na entrega de alerta de SLA'", chamadoId)).isEqualTo(1);
    }

    @Test
    void oBancoRecusaUmSegundoAlertaParaOMesmoChamadoRelogioELimiar() {
        UUID chamadoId = cadastrarChamadoP2("SLA-0003", 0);
        String inserir = "INSERT INTO viaflux.alerta_sla (id, chamado_id, prazo, limiar, prioridade, disparado_em) VALUES (?, ?, 'RESOLUCAO', 'CEM_POR_CENTO', 'P2', NOW())";
        jdbc.update(inserir, UUID.randomUUID(), chamadoId);

        assertThatThrownBy(() -> jdbc.update(inserir, UUID.randomUUID(), chamadoId)).isInstanceOf(DuplicateKeyException.class);
    }

    private long contar(String sql, Object... parametros) {
        return jdbc.queryForObject(sql, Long.class, parametros);
    }

    private Usuario cadastrarUsuario(String nome, List<String> codigosDeDepartamento, String... codigosDePerfil) {
        return transacao.execute(status -> usuarios.save(new Usuario(
                nome,
                UUID.randomUUID() + "@exemplo.com",
                "hash",
                Arrays.stream(codigosDePerfil).map(codigo -> perfis.findById(codigo).orElseThrow()).collect(Collectors.toSet()),
                null,
                codigosDeDepartamento.stream().map(codigo -> departamentos.findById(codigo).orElseThrow()).collect(Collectors.toSet()))));
    }

    private UUID cadastrarChamadoP2(String codigo, long minutosDesdeAAbertura) {
        OffsetDateTime abertoEm = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(minutosDesdeAAbertura);
        return transacao.execute(status -> {
            DadosDeAbertura dados = new DadosDeAbertura(
                    "Maria Silva", null, "Volvo FH 460", "abc-1d23", "Motor não liga",
                    DadosDeLocalizacao.apenasEndereco("BR-116, km 312"), null,
                    motivos.findById("M-MANUTENCAO-1").orElseThrow(), contextos.findById("C-MANUTENCAO-1").orElseThrow(), 10, null);
            Chamado chamado = new Chamado(codigo, dados, abertoEm);
            chamado.concluirTriagem(TipoChamado.MANUTENCAO, 5, 3, TipoChamado.MANUTENCAO, new Autor(UUID.randomUUID(), "Paula Atendente"), abertoEm);
            return chamados.save(chamado).getId();
        });
    }
}
