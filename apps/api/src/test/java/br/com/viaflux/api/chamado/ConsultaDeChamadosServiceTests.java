package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.emSaoPaulo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

class ConsultaDeChamadosServiceTests {

    private static final OffsetDateTime MEIO_DIA = emSaoPaulo("2026-10-21T12:00");
    private static final Autor PAULA = new Autor(UUID.randomUUID(), "Paula Atendente");
    private static final FiltrosDeChamados SEM_FILTROS = FiltrosDeChamados.de(null, null, null, null, null, null, null);

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(MEIO_DIA);
    private final ConsultaDeChamadosService servico = new ConsultaDeChamadosService(ambiente.acesso, ambiente.montagem);
    private final UsuarioAtual paula = atendente();

    @BeforeEach
    void preparar() {
        Chamado triagemEmRisco = chamadoAberto("VF-0001", emSaoPaulo("2026-10-21T11:45"), null, TipoChamado.MANUTENCAO, 3);
        Chamado triagemEmAndamento = chamadoAberto("VF-0002", emSaoPaulo("2026-10-21T11:58"), null, TipoChamado.TI, 5);
        triagemEmAndamento.iniciarTriagem(PAULA, emSaoPaulo("2026-10-21T11:59"));
        Chamado triagemAtrasada = chamadoAberto("VF-0003", emSaoPaulo("2026-10-21T11:00"), null, TipoChamado.LOGISTICA, 1);
        Chamado p3NaFila = triado("VF-0004", "2026-10-21T11:30", TipoChamado.MANUTENCAO, 3, 3);
        Chamado p1SemResposta = triado("VF-0005", "2026-10-21T10:30", TipoChamado.TI, 5, 5);
        Chamado p1EmAtendimento = triado("VF-0006", "2026-10-21T11:00", TipoChamado.MANUTENCAO, 5, 5);
        p1EmAtendimento.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, emSaoPaulo("2026-10-21T11:10"));
        Chamado p4Fechado = triado("VF-0007", "2026-10-21T09:00", TipoChamado.MANUTENCAO, 1, 1);
        p4Fechado.alterarStatus(StatusChamado.EM_ATENDIMENTO, null, emSaoPaulo("2026-10-21T09:30"));
        p4Fechado.alterarStatus(StatusChamado.RESOLVIDO, null, emSaoPaulo("2026-10-21T10:00"));
        p4Fechado.alterarStatus(StatusChamado.FECHADO, null, emSaoPaulo("2026-10-21T10:30"));
        given(ambiente.chamados.buscarAtivos(null)).willReturn(List.of(
                p4Fechado, p1EmAtendimento, triagemEmRisco, p3NaFila, triagemAtrasada, p1SemResposta, triagemEmAndamento));
    }

    @Test
    void filaAtivaOrdenaPorPrioridadeScoreEAntiguidadeSemExcecoesNemEncerrados() {
        ChamadosPageResponse pagina = servico.listar(SEM_FILTROS, 0, 20, paula);

        assertThat(codigos(pagina)).containsExactly("VF-0005", "VF-0006", "VF-0004");
        assertThat(pagina.totalElements()).isEqualTo(3);
        assertThat(pagina.totalPages()).isEqualTo(1);
    }

    @Test
    void ordenacaoPorRecentesUsaAAbertura() {
        ChamadosPageResponse pagina = servico.listar(filtros(null, null, null, null, null, "recentes"), 0, 20, paula);

        assertThat(codigos(pagina)).containsExactly("VF-0004", "VF-0006", "VF-0005");
    }

    @Test
    void etapaSeparaAFilaDeTriagemDoAtendimento() {
        assertThat(codigos(servico.listar(filtros(null, null, null, null, "TRIAGEM", null), 0, 20, paula)))
                .containsExactly("VF-0003", "VF-0001", "VF-0002");
        assertThat(codigos(servico.listar(filtros(null, null, null, null, "atendimento", null), 0, 20, paula)))
                .containsExactly("VF-0005", "VF-0006", "VF-0004");
    }

    @Test
    void filtraPorStatusPrioridadeEDepartamento() {
        assertThat(codigos(servico.listar(filtros("Na fila", null, null, null, null, null), 0, 20, paula)))
                .containsExactly("VF-0005", "VF-0004");
        assertThat(codigos(servico.listar(filtros(null, "P1", null, null, null, null), 0, 20, paula)))
                .containsExactly("VF-0005", "VF-0006");
        assertThat(codigos(servico.listar(filtros(null, null, "MANUTENCAO", null, null, null), 0, 20, paula)))
                .containsExactly("VF-0006", "VF-0004");
        assertThat(codigos(servico.listar(filtros("Fechado", null, null, null, null, null), 0, 20, paula)))
                .containsExactly("VF-0007");
    }

    @Test
    void filtraPelaSituacaoDoSla() {
        assertThat(codigos(servico.listar(filtros(null, null, null, "VIOLADO", null, null), 0, 20, paula)))
                .containsExactly("VF-0005");
        assertThat(codigos(servico.listar(filtros(null, null, null, "EM_RISCO", null, null), 0, 20, paula)))
                .containsExactly("VF-0005", "VF-0006");
        assertThat(codigos(servico.listar(filtros(null, null, null, "NO_PRAZO", null, null), 0, 20, paula)))
                .containsExactly("VF-0004");
    }

    @Test
    void paginaOResultadoJaOrdenado() {
        ChamadosPageResponse pagina = servico.listar(SEM_FILTROS, 1, 2, paula);

        assertThat(codigos(pagina)).containsExactly("VF-0004");
        assertThat(pagina.page()).isEqualTo(1);
        assertThat(pagina.size()).isEqualTo(2);
        assertThat(pagina.totalElements()).isEqualTo(3);
        assertThat(pagina.totalPages()).isEqualTo(2);
        assertThat(servico.listar(SEM_FILTROS, 5, 2, paula).content()).isEmpty();
    }

    @Test
    void paginaMuitoAlemDoFimVoltaVaziaSemEstourarOInteiro() {
        assertThat(servico.listar(SEM_FILTROS, 21_474_837, 100, paula).content()).isEmpty();
    }

    @Test
    void recusaPaginaMaiorQueCem() {
        assertThatThrownBy(() -> servico.listar(SEM_FILTROS, 0, 101, paula))
                .isInstanceOf(FiltroChamadoInvalidoException.class)
                .hasMessage("O tamanho máximo da página é 100.");
    }

    @Test
    void departamentoListaSoOsTriadosDaPropriaFila() {
        assertThat(codigos(servico.listar(SEM_FILTROS, 0, 20, departamento(TipoChamado.MANUTENCAO))))
                .containsExactly("VF-0006", "VF-0004");
        assertThat(codigos(servico.listar(SEM_FILTROS, 0, 20, departamento(TipoChamado.LOGISTICA)))).isEmpty();
    }

    @Test
    void resumoContaStatusPrioridadesDepartamentosESla() {
        ResumoDeChamadosResponse resumo = servico.resumir(SEM_FILTROS, paula);

        assertThat(resumo.total()).isEqualTo(7);
        assertThat(resumo.porStatus()).containsExactly(
                Map.entry("Aberto", 2L), Map.entry("Em triagem", 1L), Map.entry("Na fila", 2L), Map.entry("Em atendimento", 1L),
                Map.entry("Aguardando", 0L), Map.entry("Resolvido", 0L), Map.entry("Fechado", 1L));
        assertThat(resumo.porPrioridade()).containsExactly(
                Map.entry(Prioridade.P1, 2L), Map.entry(Prioridade.P2, 0L), Map.entry(Prioridade.P3, 1L), Map.entry(Prioridade.P4, 1L));
        assertThat(resumo.porDepartamento()).containsEntry(TipoChamado.MANUTENCAO, 3L).containsEntry(TipoChamado.TI, 1L)
                .containsEntry(TipoChamado.LOGISTICA, 0L);
        assertThat(resumo.sla().primeiraResposta()).isEqualTo(new ResumoDeChamadosResponse.Contadores(2, 0, 1));
        assertThat(resumo.sla().resolucao()).isEqualTo(new ResumoDeChamadosResponse.Contadores(1, 2, 0));
        assertThat(resumo.p1SemPrimeiraResposta()).containsExactly("VF-0005");
    }

    @Test
    void resumoTrazOsContadoresDaFilaDeTriagem() {
        ResumoDeChamadosResponse.Triagem triagem = servico.resumir(SEM_FILTROS, paula).triagem();

        assertThat(triagem.aguardando()).isEqualTo(2);
        assertThat(triagem.emAndamento()).isEqualTo(1);
        assertThat(triagem.emRisco()).isEqualTo(1);
        assertThat(triagem.atrasados()).isEqualTo(1);
        assertThat(triagem.proximoLimite()).isEqualTo(Datas.local(emSaoPaulo("2026-10-21T11:40")));
    }

    @Test
    void resumoIgnoraOFiltroDeStatus() {
        assertThat(servico.resumir(filtros("Fechado", null, null, null, null, null), paula).total()).isEqualTo(7);
    }

    @Test
    void clienteConsultaOProprioChamadoSemOsRegistrosInternos() {
        UUID anaId = UUID.randomUUID();
        Chamado daAna = ambiente.cadastrar(chamadoAberto("VF-0010", MEIO_DIA.minusMinutes(30),
                usuario(anaId, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3));
        daAna.concluirTriagem(TipoChamado.MANUTENCAO, 1, 1, TipoChamado.MANUTENCAO, PAULA, MEIO_DIA.minusMinutes(20));
        daAna.definirOverride(Prioridade.P2, "Cliente estratégico", PAULA, MEIO_DIA.minusMinutes(15));
        ambiente.historico.registrarParaTodos(daAna, TipoEvento.ABERTURA, "Chamado aberto", "Portal", PAULA, MEIO_DIA.minusMinutes(30));
        ambiente.historico.registrarInterno(daAna, TipoEvento.OVERRIDE, "Prioridade alterada manualmente", "P4 → P2", PAULA, MEIO_DIA.minusMinutes(15));

        ChamadoResponse paraACliente = servico.consultar("VF-0010", cliente(anaId));
        ChamadoResponse paraACentral = servico.consultar("VF-0010", paula);

        assertThat(paraACliente.timeline()).extracting(EventoResponse::acao).containsExactly("Chamado aberto");
        assertThat(paraACliente.override()).isNull();
        assertThat(paraACliente.prioridade()).isEqualTo(Prioridade.P2);
        assertThat(paraACentral.timeline()).extracting(EventoResponse::acao)
                .containsExactly("Chamado aberto", "Prioridade alterada manualmente");
        assertThat(paraACentral.override().prioridade()).isEqualTo(Prioridade.P2);
    }

    @Test
    void consultaDeChamadoAlheioNaoRevelaQueEleExiste() {
        ambiente.cadastrar(chamadoAberto("VF-0010", MEIO_DIA, usuario(UUID.randomUUID(), "Ana", "CLIENTE"), TipoChamado.MANUTENCAO, 3));

        assertThatThrownBy(() -> servico.consultar("VF-0010", cliente(UUID.randomUUID())))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void interpretaOsFiltrosDaQueryString() {
        FiltrosDeChamados filtros = FiltrosDeChamados.de(" volvo ", "na fila", "p1", "manutencao", "violado", "triagem", "RECENTES");

        assertThat(filtros).isEqualTo(new FiltrosDeChamados(" volvo ", StatusChamado.NA_FILA, Prioridade.P1, TipoChamado.MANUTENCAO,
                SituacaoPrazo.VIOLADO, FiltrosDeChamados.Etapa.TRIAGEM, FiltrosDeChamados.Ordenacao.RECENTES));
        assertThat(SEM_FILTROS.ordenacao()).isEqualTo(FiltrosDeChamados.Ordenacao.FILA);
    }

    @Test
    void recusaFiltrosInvalidos() {
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, "Pendente", null, null, null, null, null))
                .hasMessage("O status informado não é válido.");
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, null, "Urgente", null, null, null, null))
                .hasMessage("A prioridade informada não é válida.");
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, null, null, "OFICINA", null, null, null))
                .hasMessage("O departamento informado não é válido.");
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, null, null, null, "CUMPRIDO", null, null))
                .hasMessage("A situação de SLA informada não é válida.");
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, null, null, null, null, "ENCERRAMENTO", null))
                .hasMessage("A etapa informada não é válida.");
        assertThatThrownBy(() -> FiltrosDeChamados.de(null, null, null, null, null, null, "antigos"))
                .isInstanceOf(FiltroChamadoInvalidoException.class)
                .hasMessage("A ordenação informada não é válida.");
    }

    private static Chamado triado(String codigo, String abertura, TipoChamado departamento, int severidade, int urgencia) {
        OffsetDateTime abertoEm = emSaoPaulo(abertura);
        Chamado chamado = chamadoAberto(codigo, abertoEm, null, departamento, 3);
        chamado.concluirTriagem(departamento, severidade, urgencia, departamento, PAULA, abertoEm.plusMinutes(5));
        return chamado;
    }

    private static FiltrosDeChamados filtros(String status, String prioridade, String departamento, String sla, String etapa, String ordenacao) {
        return FiltrosDeChamados.de(null, status, prioridade, departamento, sla, etapa, ordenacao);
    }

    private static List<String> codigos(ChamadosPageResponse pagina) {
        return pagina.content().stream().map(ChamadoResumoResponse::id).toList();
    }
}
