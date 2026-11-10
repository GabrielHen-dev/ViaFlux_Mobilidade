package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.operacao.EscalonamentoService;
import br.com.viaflux.api.chamado.triagem.RoteamentoComPlantao;
import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import br.com.viaflux.api.usuario.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.emSaoPaulo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeSla;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AlertasDeSlaServiceTests {

    private record NoPortal(UUID destinatario, String codigo, String assunto, String mensagem) {
    }

    private static final class RelogioAjustavel extends Clock {

        private Instant agora;

        private RelogioAjustavel(OffsetDateTime inicio) {
            this.agora = inicio.toInstant();
        }

        private void ajustar(OffsetDateTime instante) {
            this.agora = instante.toInstant();
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ);
    private final AlertaDeSlaRepository alertas = mock(AlertaDeSlaRepository.class);
    private final EntregaDeAlertaDeSlaRepository entregas = mock(EntregaDeAlertaDeSlaRepository.class);
    private final LiderancaRepository lideranca = mock(LiderancaRepository.class);
    private final EquipeDoDepartamentoRepository equipes = mock(EquipeDoDepartamentoRepository.class);

    private final List<Chamado> acompanhados = new ArrayList<>();
    private final List<AlertaDeSla> alertasGravados = new ArrayList<>();
    private final Map<UUID, EntregaDeAlertaDeSla> entregasGravadas = new LinkedHashMap<>();
    private final List<NoPortal> portal = new ArrayList<>();
    private final List<UUID> emailsTentados = new ArrayList<>();
    private final Set<UUID> emailsComFalha = new HashSet<>();
    private final Set<UUID> emailsComErroInesperado = new HashSet<>();
    private final RelogioAjustavel relogio = new RelogioAjustavel(QUARTA_AS_DEZ);

    private final Usuario lia = usuario(UUID.randomUUID(), "Lia Líder", "LIDER_OPERACIONAL");
    private final Usuario adao = usuario(UUID.randomUUID(), "Adão Admin", "ADMIN");
    private final Usuario debora = usuario(UUID.randomUUID(), "Débora Departamento", "DEPARTAMENTO", "LIDER_DEPARTAMENTO");
    private final Usuario marina = usuario(UUID.randomUUID(), "Marina Manutenção", "DEPARTAMENTO");
    private final Usuario diego = usuario(UUID.randomUUID(), "Diego Assistência", "DEPARTAMENTO");
    private final Usuario paula = usuario(UUID.randomUUID(), "Paula Atendente", "ATENDENTE");
    private final Autor responsavel = new Autor(UUID.randomUUID(), "Rui Responsável");

    private DisparoDeAlertasDeSla disparo;
    private AlertasDeSlaService servico;

    @BeforeEach
    void montarServico() {
        given(ambiente.chamados.idsComStatus(any())).willAnswer(invocacao -> {
            Collection<StatusChamado> status = invocacao.getArgument(0);
            return acompanhados.stream()
                    .filter(chamado -> status.contains(chamado.getStatus()))
                    .map(Chamado::getId)
                    .toList();
        });
        given(alertas.save(any(AlertaDeSla.class))).willAnswer(invocacao -> {
            alertasGravados.add(invocacao.getArgument(0));
            return invocacao.getArgument(0);
        });
        given(alertas.findByChamadoId(any(UUID.class))).willAnswer(invocacao -> alertasGravados.stream()
                .filter(alerta -> alerta.getChamado().getId().equals(invocacao.getArgument(0)))
                .toList());
        given(entregas.save(any(EntregaDeAlertaDeSla.class))).willAnswer(invocacao -> {
            EntregaDeAlertaDeSla entrega = invocacao.getArgument(0);
            entregasGravadas.put(entrega.getId(), entrega);
            return entrega;
        });
        given(entregas.findById(any(UUID.class))).willAnswer(invocacao -> Optional.ofNullable(entregasGravadas.get(invocacao.<UUID>getArgument(0))));
        given(entregas.findTop100ByEstadoAndProximaTentativaEmLessThanEqualOrderByProximaTentativaEmAsc(any(), any()))
                .willAnswer(invocacao -> {
                    OffsetDateTime instante = invocacao.getArgument(1);
                    return entregasGravadas.values().stream()
                            .filter(entrega -> entrega.getEstado() == invocacao.getArgument(0))
                            .filter(entrega -> !entrega.getProximaTentativaEm().isAfter(instante))
                            .sorted(Comparator.comparing(EntregaDeAlertaDeSla::getProximaTentativaEm))
                            .toList();
                });
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA)).willReturn(List.of(lia));
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DE_CONTINGENCIA)).willReturn(List.of(adao));
        given(lideranca.ativosComPerfil(DestinatariosDeAlertaDeSla.PERFIS_DA_CENTRAL_SEM_PLANTONISTA)).willReturn(List.of(paula));
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_LIDER_DO_DEPARTAMENTO, TipoChamado.MANUTENCAO.name()))
                .willReturn(List.of(debora));
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_EQUIPE_DO_DEPARTAMENTO, TipoChamado.MANUTENCAO.name()))
                .willReturn(List.of(marina));
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_EQUIPE_DO_DEPARTAMENTO, TipoChamado.ASSISTENCIA_24H.name()))
                .willReturn(List.of(diego));

        CanalDeAlertaDeSla canal = new CanalDeAlertaDeSla() {
            @Override
            public void registrarNoPortal(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String assunto, String mensagem, OffsetDateTime instante) {
                portal.add(new NoPortal(destinatarioId, codigoDoChamado, assunto, mensagem));
            }

            @Override
            public boolean enviarPorEmail(UUID destinatarioId, String codigoDoChamado, String assunto, String mensagem) {
                emailsTentados.add(destinatarioId);
                if (emailsComErroInesperado.contains(destinatarioId)) {
                    throw new IllegalStateException("Banco indisponível");
                }
                return !emailsComFalha.contains(destinatarioId);
            }
        };
        RoteamentoComPlantao roteamento = new RoteamentoComPlantao(ChamadosDeTeste.EXPEDIENTE);
        disparo = new DisparoDeAlertasDeSla(ambiente.chamados, alertas, entregas, politicaDeSla(),
                new DestinatariosDeAlertaDeSla(lideranca, equipes), roteamento, canal, ambiente.historico);
        servico = new AlertasDeSlaService(ambiente.chamados, disparo, new RegistroDeEntregasDeAlerta(entregas, ambiente.historico), canal, relogio);
    }

    @Test
    void abaixoDeCinquentaPorCentoNadaEhDisparado() {
        acompanhar(chamadoP2());

        verificarAos(14);

        assertThat(alertasGravados).isEmpty();
        assertThat(portal).isEmpty();
    }

    @Test
    void cinquentaPorCentoDaResolucaoMarcaEmRiscoEAvisaOResponsavelAtual() {
        Chamado chamado = acompanhar(chamadoP2Assumido());

        verificarAos(120);

        assertThat(gatilhos()).containsExactly(new GatilhoDeSla(PrazoDeSla.RESOLUCAO, LimiarDeSla.CINQUENTA_POR_CENTO));
        assertThat(destinatariosNoPortal()).containsExactly(responsavel.id());
        assertThat(portal.getFirst().assunto()).isEqualTo("SLA em risco (50%)");
        assertThat(ambiente.eventoComAcao("Prazo de SLA em risco")).isPresent();
        assertThat(ambiente.eventoComAcao("Prazo de SLA em risco").orElseThrow().getTipo()).isEqualTo(TipoEvento.SLA);
        assertThat(politicaDeSla().avaliar(chamado, relogio.instant()).resolucao().situacao()).isEqualTo(SituacaoPrazo.EM_RISCO);
    }

    @Test
    void semResponsavelOsCinquentaPorCentoAvisamAEquipeDoDepartamento() {
        acompanhar(chamadoP2());

        verificarAos(15);

        assertThat(gatilhos()).containsExactly(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO));
        assertThat(destinatariosNoPortal()).containsExactly(marina.getId());
    }

    @Test
    void oitentaPorCentoAlertaOLiderDoDepartamentoEOLiderOperacional() {
        acompanhar(chamadoP2());
        verificarAos(15);
        portal.clear();

        verificarAos(24);

        assertThat(portal).hasSize(2);
        assertThat(destinatariosNoPortal()).containsExactly(debora.getId(), lia.getId());
        assertThat(portal).allMatch(aviso -> aviso.assunto().equals("SLA em risco (80%)"));
        assertThat(ambiente.eventoComAcao("Alerta de SLA à liderança").orElseThrow().getTipo()).isEqualTo(TipoEvento.ESCALONAMENTO);
    }

    @Test
    void semLiderDoDepartamentoCadastradoOsOitentaPorCentoVaoParaAEquipe() {
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_LIDER_DO_DEPARTAMENTO, TipoChamado.MANUTENCAO.name()))
                .willReturn(List.of());
        acompanhar(chamadoP2());
        verificarAos(15);
        portal.clear();

        verificarAos(24);

        assertThat(destinatariosNoPortal()).containsExactly(marina.getId(), lia.getId());
    }

    @Test
    void semLiderOperacionalOAlertaUsaAContingenciaDeAdministradores() {
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA)).willReturn(List.of());
        acompanhar(chamadoP2());
        verificarAos(15);
        portal.clear();

        verificarAos(24);

        assertThat(destinatariosNoPortal()).containsExactly(debora.getId(), adao.getId());
    }

    @Test
    void cemPorCentoRegistraAViolacaoEAvisaOLiderOperacionalEOResponsavel() {
        acompanhar(chamadoP2Assumido());
        verificarAos(120);
        verificarAos(192);
        portal.clear();

        verificarAos(240);

        assertThat(destinatariosNoPortal()).containsExactly(lia.getId(), responsavel.id());
        assertThat(portal).allMatch(aviso -> aviso.assunto().equals("SLA violado"));
        ChamadoEvento violacao = ambiente.eventoComAcao("Violação de SLA registrada").orElseThrow();
        assertThat(violacao.getTipo()).isEqualTo(TipoEvento.SLA);
        assertThat(violacao.getDetalhe()).contains("Situação: Violado");
    }

    @Test
    void p1SemPrimeiraRespostaEmQuinzeMinutosAcionaACentralEOLiderOperacional() {
        acompanhar(chamadoP1());
        verificarAos(8);
        verificarAos(12);
        portal.clear();

        verificarAos(15);

        assertThat(gatilhos()).contains(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA));
        NoPortal acionamento = portal.stream().filter(aviso -> aviso.assunto().equals("P1 sem primeira resposta")).findFirst().orElseThrow();
        assertThat(acionamento.mensagem()).contains("Acionamento: Central de Assistência");
        assertThat(portal.stream().filter(aviso -> aviso.assunto().equals("P1 sem primeira resposta")).map(NoPortal::destinatario))
                .containsExactly(diego.getId(), lia.getId());
        assertThat(ambiente.eventoComAcao("P1 sem primeira resposta escalonado").orElseThrow().getTipo()).isEqualTo(TipoEvento.ESCALONAMENTO);
    }

    @Test
    void foraDoExpedienteOP1SemPrimeiraRespostaAcionaOPlantao() {
        OffsetDateTime quartaAsVinteEDuas = emSaoPaulo("2026-10-21T22:00");
        acompanhar(chamadoTriado("VF-0001", quartaAsVinteEDuas, TipoChamado.MANUTENCAO, 5, 5));
        relogio.ajustar(quartaAsVinteEDuas.plusMinutes(15));

        servico.verificarPrazos();

        assertThat(portal.stream().filter(aviso -> aviso.assunto().equals("P1 sem primeira resposta")).map(NoPortal::mensagem))
                .allMatch(mensagem -> mensagem.contains("Acionamento: Plantão"));
    }

    @Test
    void semNinguemNaAssistenciaOAcionamentoDoP1ChegaAosAtendentes() {
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_EQUIPE_DO_DEPARTAMENTO, TipoChamado.ASSISTENCIA_24H.name()))
                .willReturn(List.of());
        acompanhar(chamadoP1());

        verificarAos(15);

        assertThat(portal.stream().filter(aviso -> aviso.assunto().equals("P1 sem primeira resposta")).map(NoPortal::destinatario))
                .containsExactly(paula.getId(), lia.getId());
    }

    @Test
    void p1ComPrimeiraRespostaNaoAcionaACentral() {
        Chamado chamado = acompanhar(chamadoP1());
        chamado.assumirAtendimento(responsavel, QUARTA_AS_DEZ.plusMinutes(10));

        verificarAos(16);

        assertThat(gatilhos()).isEmpty();
    }

    @Test
    void p1AindaDentroDosQuinzeMinutosNaoAcionaACentral() {
        acompanhar(chamadoP1());

        verificarAos(14);

        assertThat(gatilhos()).doesNotContain(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA));
    }

    @Test
    void p2NaoTemAcionamentoDeP1() {
        acompanhar(chamadoP2());

        verificarAos(31);

        assertThat(gatilhos()).doesNotContain(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA));
    }

    @Test
    void osAlertasIdentificamProtocoloPrioridadePrazoESituacao() {
        acompanhar(chamadoP2());

        verificarAos(15);

        assertThat(portal.getFirst().codigo()).isEqualTo("VF-0001");
        assertThat(portal.getFirst().mensagem()).contains(
                "Protocolo VF-0001", "Prioridade P2", "Prazo: Primeira resposta", "Situação: Em risco", "50% do prazo consumido");
        assertThat(ambiente.eventoComAcao("Prazo de SLA em risco").orElseThrow().getDetalhe()).isEqualTo(portal.getFirst().mensagem());
    }

    @Test
    void oMesmoGatilhoNaoSeRepeteEmNovasVerificacoes() {
        acompanhar(chamadoP2());
        verificarAos(15);
        int eventosDepoisDoDisparo = ambiente.registrados.size();

        verificarAos(15);
        verificarAos(16);
        verificarAos(23);

        assertThat(alertasGravados).hasSize(1);
        assertThat(portal).hasSize(1);
        assertThat(emailsTentados).hasSize(1);
        assertThat(ambiente.registrados).hasSize(eventosDepoisDoDisparo);
    }

    @Test
    void cadaRelogioTemSeusPropriosGatilhos() {
        acompanhar(chamadoP2());

        verificarAos(120);
        verificarAos(120);

        assertThat(gatilhos()).containsExactlyInAnyOrder(
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.OITENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CEM_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.RESOLUCAO, LimiarDeSla.CINQUENTA_POR_CENTO));
    }

    @Test
    void reclassificarParaP1DisparaApenasOsGatilhosAindaNaoRegistrados() {
        Chamado chamado = acompanhar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));
        chamado.definirOverride(Prioridade.P2, "Cliente parado em rodovia", responsavel, QUARTA_AS_DEZ.plusMinutes(6));
        verificarAos(15);
        assertThat(gatilhos()).containsExactly(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO));

        chamado.definirOverride(Prioridade.P1, "Risco à segurança", responsavel, QUARTA_AS_DEZ.plusMinutes(16));
        verificarAos(16);

        assertThat(gatilhos()).containsExactlyInAnyOrder(
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.OITENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CEM_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA));
    }

    @Test
    void limiaresAlcancadosDeUmaSoVezFicamRegistradosMasCadaPessoaRecebeSoOMaisGrave() {
        acompanhar(chamadoP2());

        verificarAos(31);

        assertThat(gatilhos()).containsExactlyInAnyOrder(
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.OITENTA_POR_CENTO),
                new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CEM_POR_CENTO));
        assertThat(portal.stream().filter(aviso -> aviso.destinatario().equals(lia.getId())).map(NoPortal::assunto))
                .containsExactly("SLA violado");
        assertThat(portal.stream().filter(aviso -> aviso.destinatario().equals(marina.getId())).map(NoPortal::assunto))
                .containsExactly("SLA violado");
        assertThat(portal.stream().filter(aviso -> aviso.destinatario().equals(debora.getId())).map(NoPortal::assunto))
                .containsExactly("SLA em risco (80%)");
        assertThat(ambiente.eventoComAcao("Alerta de SLA já coberto")).isPresent();
    }

    @Test
    void gatilhoSemDestinatarioFicaRegistradoNoHistoricoESemRepetir() {
        given(equipes.ativosComPerfilNoDepartamento(DestinatariosDeAlertaDeSla.PERFIL_EQUIPE_DO_DEPARTAMENTO, TipoChamado.MANUTENCAO.name()))
                .willReturn(List.of());
        acompanhar(chamadoP2());

        verificarAos(15);
        verificarAos(16);

        assertThat(alertasGravados).hasSize(1);
        assertThat(entregasGravadas).isEmpty();
        assertThat(ambiente.registrados.stream().filter(evento -> evento.getAcao().equals("Alerta de SLA sem destinatário"))).hasSize(1);
    }

    @Test
    void chamadoResolvidoOuCanceladoNaoDispara() {
        Chamado resolvido = acompanhar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 3));
        resolvido.resolverComResumo("Motor substituído", responsavel, QUARTA_AS_DEZ.plusMinutes(6));
        Chamado cancelado = acompanhar(chamadoTriado("VF-0002", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 3));
        cancelado.cancelar(responsavel, "Cliente desistiu do atendimento", QUARTA_AS_DEZ.plusMinutes(6));

        verificarAos(500);
        disparo.disparar(resolvido.getId(), QUARTA_AS_DEZ.plusMinutes(500));
        disparo.disparar(cancelado.getId(), QUARTA_AS_DEZ.plusMinutes(500));

        assertThat(alertasGravados).isEmpty();
    }

    @Test
    void chamadoAindaSemTriagemNaoTemPrazoParaAlertar() {
        Chamado semTriagem = acompanhar(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        disparo.disparar(semTriagem.getId(), QUARTA_AS_DEZ.plusMinutes(500));

        assertThat(alertasGravados).isEmpty();
    }

    @Test
    void aguardandoClientePausaOsGatilhosDaResolucao() {
        Chamado chamado = acompanhar(chamadoP2Assumido());
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, QUARTA_AS_DEZ.plusMinutes(10));

        verificarAos(200);

        assertThat(gatilhos()).isEmpty();
    }

    @Test
    void aguardandoFornecedorNaoPausaOsGatilhosDaResolucao() {
        Chamado chamado = acompanhar(chamadoP2Assumido());
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, QUARTA_AS_DEZ.plusMinutes(10));

        verificarAos(120);

        assertThat(gatilhos()).containsExactly(new GatilhoDeSla(PrazoDeSla.RESOLUCAO, LimiarDeSla.CINQUENTA_POR_CENTO));
    }

    @Test
    void prazoEmHorasUteisNaoConsomeForaDoExpediente() {
        OffsetDateTime quartaNoFimDoDia = emSaoPaulo("2026-10-21T17:30");
        acompanhar(chamadoTriado("VF-0001", quartaNoFimDoDia, TipoChamado.MANUTENCAO, 3, 3));

        relogio.ajustar(emSaoPaulo("2026-10-21T23:00"));
        servico.verificarPrazos();
        assertThat(gatilhos()).isEmpty();

        relogio.ajustar(emSaoPaulo("2026-10-22T08:30"));
        servico.verificarPrazos();
        assertThat(gatilhos()).containsExactly(new GatilhoDeSla(PrazoDeSla.PRIMEIRA_RESPOSTA, LimiarDeSla.CINQUENTA_POR_CENTO));
    }

    @Test
    void osEventosDoAlertaSaoInternosEDoSistemaESemAlterarAUltimaAtualizacaoDoChamado() {
        Chamado chamado = acompanhar(chamadoP2());
        OffsetDateTime atualizadoEm = chamado.getAtualizadoEm();

        verificarAos(15);

        assertThat(ambiente.registrados).isNotEmpty();
        assertThat(ambiente.registrados).noneMatch(ChamadoEvento::isVisivelCliente);
        assertThat(ambiente.registrados).allMatch(evento -> evento.getAutor().equals(Autor.SISTEMA));
        assertThat(ambiente.eventoComAcao("Alerta de SLA notificado").orElseThrow().getDetalhe()).contains("Marina Manutenção");
        assertThat(chamado.getAtualizadoEm()).isEqualTo(atualizadoEm);
    }

    @Test
    void falhaNoEmailFicaRegistradaEAgendaUmaNovaTentativaSemDuplicarOPortal() {
        emailsComFalha.add(marina.getId());
        acompanhar(chamadoP2());

        verificarAos(15);

        EntregaDeAlertaDeSla entrega = entregaDe(marina);
        assertThat(entrega.getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.PENDENTE);
        assertThat(entrega.getTentativas()).isEqualTo(1);
        assertThat(entrega.getProximaTentativaEm()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(15).plus(EntregaDeAlertaDeSla.ESPERA_ENTRE_TENTATIVAS));
        assertThat(ambiente.eventoComAcao("Falha na entrega de alerta de SLA")).isPresent();
        assertThat(portal).hasSize(1);
    }

    @Test
    void novaTentativaEsperaOIntervaloEConfirmaAEntregaNoHistorico() {
        emailsComFalha.add(marina.getId());
        acompanhar(chamadoP2());
        verificarAos(15);

        verificarAos(19);
        assertThat(emailsTentados).hasSize(1);

        emailsComFalha.clear();
        verificarAos(20);

        assertThat(emailsTentados).hasSize(2);
        assertThat(entregaDe(marina).getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.ENTREGUE);
        assertThat(ambiente.eventoComAcao("Alerta de SLA reenviado").orElseThrow().getDetalhe()).contains("tentativa 2");
        assertThat(portal).hasSize(1);
    }

    @Test
    void asTentativasSaoLimitadasEOEsgotamentoFicaNoHistorico() {
        emailsComFalha.add(marina.getId());
        Chamado chamado = acompanhar(chamadoP2Assumido());
        chamado.alterarStatus(StatusChamado.NA_FILA, null, QUARTA_AS_DEZ.plusMinutes(10));
        verificarAos(120);

        verificarAos(125);
        verificarAos(135);
        verificarAos(155);
        verificarAos(195);
        verificarAos(200);

        EntregaDeAlertaDeSla entrega = entregaDe(marina);
        assertThat(entrega.getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.ESGOTADA);
        assertThat(entrega.getTentativas()).isEqualTo(EntregaDeAlertaDeSla.MAXIMO_DE_TENTATIVAS);
        assertThat(entrega.getProximaTentativaEm()).isNull();
        assertThat(emailsTentados.stream().filter(marina.getId()::equals)).hasSize(EntregaDeAlertaDeSla.MAXIMO_DE_TENTATIVAS);
        assertThat(ambiente.registrados.stream().filter(evento -> evento.getAcao().equals("Falha na entrega de alerta de SLA"))).hasSize(1);
        assertThat(ambiente.eventoComAcao("Falha definitiva no alerta de SLA")).isPresent();
    }

    @Test
    void falhaDeUmDestinatarioNaoImpedeOsDemais() {
        emailsComFalha.add(debora.getId());
        acompanhar(chamadoP2());
        verificarAos(15);

        verificarAos(24);

        assertThat(entregaDe(debora).getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.PENDENTE);
        assertThat(entregaDe(lia).getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.ENTREGUE);
    }

    @Test
    void erroInesperadoNaEntregaNaoConsomeTentativaNemInterrompeOsDemais() {
        emailsComErroInesperado.add(debora.getId());
        acompanhar(chamadoP2());
        verificarAos(15);

        verificarAos(24);

        assertThat(entregaDe(debora).getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.PENDENTE);
        assertThat(entregaDe(debora).getTentativas()).isZero();
        assertThat(entregaDe(lia).getEstado()).isEqualTo(EstadoDaEntregaDeAlerta.ENTREGUE);
    }

    @Test
    void erroEmUmChamadoNaoInterrompeOsDemais() {
        Chamado comErro = acompanhar(chamadoP2());
        Chamado saudavel = acompanhar(chamadoTriado("VF-0002", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 3));
        given(ambiente.chamados.findById(comErro.getId())).willThrow(new IllegalStateException("Banco indisponível"));

        verificarAos(15);

        assertThat(alertasGravados).extracting(alerta -> alerta.getChamado().getId()).containsExactly(saudavel.getId());
    }

    private Chamado chamadoP1() {
        return chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5);
    }

    private Chamado chamadoP2() {
        return chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 3);
    }

    private Chamado chamadoP2Assumido() {
        Chamado chamado = chamadoP2();
        chamado.assumirAtendimento(responsavel, QUARTA_AS_DEZ.plusMinutes(6));
        return chamado;
    }

    private Chamado acompanhar(Chamado chamado) {
        acompanhados.add(chamado);
        given(ambiente.chamados.findById(chamado.getId())).willReturn(Optional.of(chamado));
        return chamado;
    }

    private void verificarAos(long minutos) {
        relogio.ajustar(QUARTA_AS_DEZ.plus(Duration.ofMinutes(minutos)));
        servico.verificarPrazos();
    }

    private List<GatilhoDeSla> gatilhos() {
        return alertasGravados.stream().map(AlertaDeSla::gatilho).toList();
    }

    private List<UUID> destinatariosNoPortal() {
        return portal.stream().map(NoPortal::destinatario).toList();
    }

    private EntregaDeAlertaDeSla entregaDe(Usuario destinatario) {
        return entregasGravadas.values().stream()
                .filter(entrega -> entrega.getDestinatarioId().equals(destinatario.getId()))
                .findFirst()
                .orElseThrow();
    }
}
