package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
class HistoricoDoChamado {

    private final ChamadoEventoRepository eventos;

    HistoricoDoChamado(ChamadoEventoRepository eventos) {
        this.eventos = eventos;
    }

    void registrarParaTodos(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, OffsetDateTime instante) {
        registrar(chamado, tipo, acao, detalhe, autor, true, instante);
    }

    void registrarInterno(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, OffsetDateTime instante) {
        registrar(chamado, tipo, acao, detalhe, autor, false, instante);
    }

    void registrarMensagem(Chamado chamado, String acao, String texto, Autor autor, boolean visivelCliente, OrigemDaMensagem origem, UUID anexoId, OffsetDateTime instante) {
        ChamadoEvento mensagem = new ChamadoEvento(chamado, TipoEvento.ATUALIZACAO, acao, texto, autor, visivelCliente, instante);
        mensagem.marcarComoMensagem(origem, anexoId);
        eventos.save(mensagem);
        chamado.tocar(instante);
    }

    void registrar(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, boolean visivelCliente, OffsetDateTime instante) {
        eventos.save(new ChamadoEvento(chamado, tipo, acao, detalhe, autor, visivelCliente, instante));
        chamado.tocar(instante);
    }
}
