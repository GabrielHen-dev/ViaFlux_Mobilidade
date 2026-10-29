package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.EXPEDIENTE;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.emSaoPaulo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

class EncerramentoServiceTests {

    private static final UUID ANA = UUID.randomUUID();
    private static final OffsetDateTime RESOLVIDO_NA_QUARTA = QUARTA_AS_DEZ.plusHours(1);
    private static final OffsetDateTime LEMBRETE_NA_SEXTA = emSaoPaulo("2026-10-23T11:00");
    private static final OffsetDateTime PRAZO_NA_SEGUNDA = emSaoPaulo("2026-10-26T11:00");
    private static final MotivoDoSolicitanteRequest MOTIVO = new MotivoDoSolicitanteRequest("O motor voltou a falhar na estrada.");

    private final UsuarioAtual ana = cliente(ANA);

    @Test
    void solicitanteConfirmaASolucaoEOChamadoFecha() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(RESOLVIDO_NA_QUARTA.plusHours(2));
        Chamado chamado = ambiente.cadastrar(chamadoResolvido());

        ChamadoResponse resposta = servico(ambiente).confirmar("VF-0001", ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.FECHADO);
        assertThat(chamado.getFechadoEm()).isEqualTo(RESOLVIDO_NA_QUARTA.plusHours(2));
        assertThat(resposta.reaberturaAte()).isEqualTo(Datas.local(emSaoPaulo("2026-10-28T13:00")));
        assertThat(ambiente.eventoComAcao("Solução confirmada pelo solicitante")).get()
                .satisfies(evento -> assertThat(evento.isVisivelCliente()).isTrue());
        assertThat(ambiente.notificacoes).singleElement()
                .satisfies(notificacao -> assertThat(notificacao.novoStatus()).isEqualTo("Fechado"));
    }

    @Test
    void contestacaoDevolveOChamadoParaAFilaSemEncerrarAResolucao() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(RESOLVIDO_NA_QUARTA.plusHours(2));
        Chamado chamado = ambiente.cadastrar(chamadoResolvido());

        servico(ambiente).contestar("VF-0001", MOTIVO, ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
        assertThat(chamado.getResolvidoEm()).isNull();
        assertThat(ambiente.eventoComAcao("Solução contestada pelo solicitante")).get()
                .satisfies(evento -> assertThat(evento.getDetalhe()).isEqualTo("Resolvido → Na fila · O motor voltou a falhar na estrada."));
    }

    @Test
    void contestacaoComResponsavelVoltaParaEmAtendimento() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(RESOLVIDO_NA_QUARTA.plusHours(2));
        Chamado chamado = chamadoTriadoDaAna();
        chamado.assumirAtendimento(new Autor(UUID.randomUUID(), "Diego Assistência"), QUARTA_AS_DEZ.plusMinutes(20));
        resolver(chamado);
        ambiente.cadastrar(chamado);

        servico(ambiente).contestar("VF-0001", MOTIVO, ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.EM_ATENDIMENTO);
    }

    @Test
    void soOSolicitanteConfirmaASolucao() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(RESOLVIDO_NA_QUARTA.plusHours(2));
        ambiente.cadastrar(chamadoResolvido());

        assertThat(erroAo(() -> servico(ambiente).confirmar("VF-0001", atendente())).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void naoConfirmaChamadoQueAindaNaoFoiResolvido() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(RESOLVIDO_NA_QUARTA);
        ambiente.cadastrar(chamadoTriadoDaAna());

        assertThat(erroAo(() -> servico(ambiente).confirmar("VF-0001", ana)).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void lembraOSolicitanteUmDiaUtilAntesDoPrazoUmaUnicaVez() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(LEMBRETE_NA_SEXTA.plusMinutes(5));
        Chamado chamado = chamadoResolvido();
        given(ambiente.chamados.findByStatusAndExcluidoEmIsNull(StatusChamado.RESOLVIDO)).willReturn(List.of(chamado));
        EncerramentoService servico = servico(ambiente);

        servico.processarPrazosDeConfirmacao();
        servico.processarPrazosDeConfirmacao();

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.RESOLVIDO);
        assertThat(ambiente.notificacoes).singleElement().satisfies(notificacao ->
                assertThat(notificacao.mensagem()).isEqualTo("Confirme se o chamado VF-0001 foi resolvido. Sem resposta, ele será fechado em 2026-10-26."));
    }

    @Test
    void antesDoLembreteNadaAcontece() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(LEMBRETE_NA_SEXTA.minusMinutes(1));
        Chamado chamado = chamadoResolvido();
        given(ambiente.chamados.findByStatusAndExcluidoEmIsNull(StatusChamado.RESOLVIDO)).willReturn(List.of(chamado));

        servico(ambiente).processarPrazosDeConfirmacao();

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.RESOLVIDO);
        assertThat(ambiente.notificacoes).isEmpty();
    }

    @Test
    void fechaAutomaticamenteAoCompletarTresDiasUteis() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(PRAZO_NA_SEGUNDA);
        Chamado chamado = chamadoResolvido();
        given(ambiente.chamados.findByStatusAndExcluidoEmIsNull(StatusChamado.RESOLVIDO)).willReturn(List.of(chamado));

        servico(ambiente).processarPrazosDeConfirmacao();

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.FECHADO);
        assertThat(chamado.getFechadoEm()).isEqualTo(PRAZO_NA_SEGUNDA);
        assertThat(chamado.getResolvidoEm()).isEqualTo(RESOLVIDO_NA_QUARTA);
        assertThat(ambiente.eventoComAcao("Fechado automaticamente")).get()
                .satisfies(evento -> assertThat(evento.getAutor().nome()).isEqualTo(Autor.SISTEMA.nome()));
    }

    @Test
    void reaberturaDentroDaJanelaVoltaParaAFilaNumNovoEpisodio() {
        Chamado chamado = chamadoResolvido();
        chamado.confirmarResolucao(RESOLVIDO_NA_QUARTA.plusHours(1));
        AmbienteDeChamados ambiente = new AmbienteDeChamados(emSaoPaulo("2026-10-28T11:00"));
        ambiente.cadastrar(chamado);

        servico(ambiente).reabrir("VF-0001", MOTIVO, ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
        assertThat(chamado.getEpisodio()).isEqualTo(2);
        assertThat(chamado.getResolvidoEm()).isNull();
        assertThat(chamado.getFechadoEm()).isNull();
        assertThat(chamado.getCodigo()).isEqualTo("VF-0001");
    }

    @Test
    void reaberturaDepoisDeCincoDiasUteisPedeUmNovoChamado() {
        Chamado chamado = chamadoResolvido();
        chamado.confirmarResolucao(RESOLVIDO_NA_QUARTA.plusHours(1));
        AmbienteDeChamados ambiente = new AmbienteDeChamados(emSaoPaulo("2026-10-28T12:01"));
        ambiente.cadastrar(chamado);

        ErroDeChamado erro = erroAo(() -> servico(ambiente).reabrir("VF-0001", MOTIVO, ana));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.FECHADO);
    }

    private static Chamado chamadoTriadoDaAna() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(ANA, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3);
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO,
                new Autor(UUID.randomUUID(), "Paula Atendente"), QUARTA_AS_DEZ.plusMinutes(5));
        return chamado;
    }

    private static Chamado chamadoResolvido() {
        Chamado chamado = chamadoTriadoDaAna();
        resolver(chamado);
        return chamado;
    }

    private static void resolver(Chamado chamado) {
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, RESOLVIDO_NA_QUARTA);
        chamado.resolverComResumo("Bateria substituída no local.", new Autor(UUID.randomUUID(), "Diego Assistência"), RESOLVIDO_NA_QUARTA);
    }

    private static EncerramentoService servico(AmbienteDeChamados ambiente) {
        return new EncerramentoService(ambiente.acesso, ambiente.chamados, new JanelaDeEncerramento(EXPEDIENTE), ambiente.historico,
                ambiente.aviso, ambiente.montagem, ambiente.relogio);
    }
}
