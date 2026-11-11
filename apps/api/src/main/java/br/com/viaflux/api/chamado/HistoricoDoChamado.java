package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.anexo.VisibilidadeDoConteudo;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class HistoricoDoChamado {

    private final ChamadoEventoRepository eventos;

    public HistoricoDoChamado(ChamadoEventoRepository eventos) {
        this.eventos = eventos;
    }

    public void registrarParaTodos(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, OffsetDateTime instante) {
        registrar(chamado, tipo, acao, detalhe, autor, true, instante);
    }

    public void registrarInterno(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, OffsetDateTime instante) {
        registrar(chamado, tipo, acao, detalhe, autor, false, instante);
    }

    public void registrarMensagem(Chamado chamado, String acao, String texto, Autor autor, boolean visivelCliente, OrigemDaMensagem origem, UUID anexoId, OffsetDateTime instante) {
        ChamadoEvento mensagem = new ChamadoEvento(chamado, TipoEvento.ATUALIZACAO, acao, texto, autor, visivelCliente, instante);
        mensagem.marcarComoMensagem(origem, anexoId);
        eventos.save(mensagem);
        chamado.tocar(instante);
    }

    public void registrarMensagemAoFornecedor(Chamado chamado, String acao, String texto, Autor autor, OffsetDateTime instante) {
        ChamadoEvento mensagem = new ChamadoEvento(chamado, TipoEvento.ATUALIZACAO, acao, texto, autor, false, instante);
        mensagem.restringirAoFornecedor();
        mensagem.marcarComoMensagem(OrigemDaMensagem.EQUIPE, null);
        eventos.save(mensagem);
        chamado.tocar(instante);
    }

    public List<ChamadoEvento> mensagensAoFornecedor(Chamado chamado) {
        return eventos.findByChamadoIdAndTipoOrderByOcorridoEmAscSequenciaAsc(chamado.getId(), TipoEvento.ATUALIZACAO).stream()
                .filter(evento -> evento.getVisibilidade() == VisibilidadeDoConteudo.FORNECEDOR)
                .toList();
    }

    public void registrar(Chamado chamado, TipoEvento tipo, String acao, String detalhe, Autor autor, boolean visivelCliente, OffsetDateTime instante) {
        eventos.save(new ChamadoEvento(chamado, tipo, acao, detalhe, autor, visivelCliente, instante));
        chamado.tocar(instante);
    }

    public void registrarAlerta(Chamado chamado, TipoEvento tipo, String acao, String detalhe, OffsetDateTime instante) {
        eventos.save(new ChamadoEvento(chamado, tipo, acao, detalhe, Autor.SISTEMA, false, instante));
    }
}
