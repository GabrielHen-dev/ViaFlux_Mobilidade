package br.com.viaflux.api.chamado;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeSla;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeTriagem;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.relogioEm;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

final class AmbienteDeChamados {

    record NotificacaoEnviada(UUID destinatarioId, String codigoDoChamado, String novoStatus, String mensagem) {
    }

    final ChamadoRepository chamados = mock(ChamadoRepository.class);
    final ChamadoEventoRepository eventos = mock(ChamadoEventoRepository.class);
    final ChamadoAnexoRepository anexos = mock(ChamadoAnexoRepository.class);
    final ServicoTerceiroRepository servicos = mock(ServicoTerceiroRepository.class);
    final List<ChamadoEvento> registrados = new ArrayList<>();
    final List<NotificacaoEnviada> notificacoes = new ArrayList<>();
    final Clock relogio;
    final AcessoAosChamados acesso;
    final HistoricoDoChamado historico;
    final AvisoAoSolicitante aviso;
    final MontagemDeChamado montagem;

    AmbienteDeChamados(OffsetDateTime agora) {
        relogio = relogioEm(agora);
        acesso = new AcessoAosChamados(chamados);
        historico = new HistoricoDoChamado(eventos);
        aviso = new AvisoAoSolicitante((destinatario, chamadoId, codigo, status, mensagem, instante) ->
                notificacoes.add(new NotificacaoEnviada(destinatario, codigo, status, mensagem)), historico);
        montagem = new MontagemDeChamado(eventos, anexos, servicos, politicaDeSla(), politicaDeTriagem(), new JanelaDeEncerramento(ChamadosDeTeste.EXPEDIENTE), relogio);
        given(eventos.save(any(ChamadoEvento.class))).willAnswer(invocacao -> {
            ChamadoEvento evento = invocacao.getArgument(0);
            registrados.add(evento);
            return evento;
        });
        given(eventos.findByChamadoIdOrderByOcorridoEmAscSequenciaAsc(any(UUID.class))).willAnswer(invocacao -> registrados.stream()
                .filter(evento -> evento.getChamado().getId().equals(invocacao.getArgument(0)))
                .toList());
    }

    Chamado cadastrar(Chamado chamado) {
        given(chamados.findByCodigo(chamado.getCodigo())).willReturn(Optional.of(chamado));
        return chamado;
    }

    List<ChamadoEvento> eventosDoTipo(TipoEvento tipo) {
        return registrados.stream().filter(evento -> evento.getTipo() == tipo).toList();
    }

    ChamadoEvento unicoEventoDoTipo(TipoEvento tipo) {
        List<ChamadoEvento> doTipo = eventosDoTipo(tipo);
        if (doTipo.size() != 1) {
            throw new AssertionError("Esperava um único evento " + tipo + ", mas havia " + doTipo.size());
        }
        return doTipo.getFirst();
    }

    Optional<ChamadoEvento> eventoComAcao(String acao) {
        return registrados.stream().filter(evento -> evento.getAcao().equals(acao)).findFirst();
    }
}
