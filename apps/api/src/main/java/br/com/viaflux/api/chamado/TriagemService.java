package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
class TriagemService {

    private final AcessoAosChamados acesso;
    private final HistoricoDoChamado historico;
    private final RegraDeRoteamento roteamento;
    private final AvisoAoSolicitante aviso;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    TriagemService(
            AcessoAosChamados acesso,
            HistoricoDoChamado historico,
            RegraDeRoteamento roteamento,
            AvisoAoSolicitante aviso,
            MontagemDeChamado montagem,
            Clock relogio
    ) {
        this.acesso = acesso;
        this.historico = historico;
        this.roteamento = roteamento;
        this.aviso = aviso;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    ChamadoResponse iniciar(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        Autor anterior = chamado.getTriagemResponsavel();
        Autor responsavel = autor(usuario);
        chamado.iniciarTriagem(responsavel, agora);
        String detalhe = anterior == null || anterior.nome().equals(responsavel.nome())
                ? "Triagem assumida por " + responsavel.nome() + "."
                : "Triagem assumida por " + responsavel.nome() + " (antes com " + anterior.nome() + ").";
        historico.registrarParaTodos(chamado, TipoEvento.TRIAGEM, "Triagem iniciada", detalhe, responsavel, agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse concluir(String codigo, ConcluirTriagemRequest request, UsuarioAtual usuario) {
        TipoChamado tipo = TipoChamado.deCodigo(request.tipo(), "tipo");
        validarPesos(request.severidade(), request.urgencia());
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        Prioridade prioridade = Prioridade.porScore(Prioridade.score(request.severidade(), request.urgencia()));
        boolean destinoEscolhido = request.departamento() != null && !request.departamento().isBlank();
        TipoChamado destino = destinoEscolhido
                ? TipoChamado.deCodigo(request.departamento(), "departamento")
                : roteamento.destino(tipo, prioridade, request.urgencia(), agora.toInstant());
        Autor autor = autor(usuario);
        chamado.concluirTriagem(tipo, request.severidade(), request.urgencia(), destino, autor, agora);

        long minutos = Duration.between(chamado.getAbertoEm(), agora).toMinutes();
        String prazo = minutos <= chamado.getTriagemPrazoMinutos() ? "dentro do prazo" : "fora do prazo";
        String observacao = request.observacao() == null || request.observacao().isBlank() ? "" : " · " + request.observacao().trim();
        historico.registrarInterno(chamado, TipoEvento.CLASSIFICACAO, "Triagem concluída",
                descreverClassificacao(tipo, request.severidade(), request.urgencia())
                        + " · em " + minutos + " min, " + prazo + " (" + chamado.getTriagemPrazoMinutos() + " min)" + observacao,
                autor, agora);
        historico.registrarParaTodos(chamado, TipoEvento.ROTEAMENTO, "Encaminhado para " + destino.getNome(),
                descreverEncaminhamento(tipo, destino, destinoEscolhido, prioridade, request.urgencia()), autor, agora);
        aviso.avisar(chamado, StatusChamado.NA_FILA.getRotulo(),
                "O chamado " + chamado.getCodigo() + " foi analisado e encaminhado para " + destino.getNome() + ".", agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse reclassificar(String codigo, ReclassificacaoRequest request, UsuarioAtual usuario) {
        TipoChamado tipo = TipoChamado.deCodigo(request.tipo(), "tipo");
        validarPesos(request.severidade(), request.urgencia());
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        String anterior = descreverClassificacao(chamado.getClassificacaoTipo(), chamado.getSeveridade(), chamado.getUrgencia());
        chamado.reclassificar(tipo, request.severidade(), request.urgencia(), agora);
        String departamentoMantido = chamado.getDepartamento() != null && chamado.getDepartamento() != tipo
                ? " · continua em " + chamado.getDepartamento().getNome()
                : "";
        historico.registrarInterno(chamado, TipoEvento.RECLASSIFICACAO, "Chamado reclassificado",
                anterior + " → " + descreverClassificacao(tipo, request.severidade(), request.urgencia())
                        + departamentoMantido + " · " + request.justificativa().trim(),
                autor(usuario), agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse definirOverride(String codigo, OverrideRequest request, UsuarioAtual usuario) {
        Prioridade prioridade = prioridadeValida(request.prioridade());
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        Prioridade anterior = chamado.prioridadeEfetiva();
        Autor autor = autor(usuario);
        chamado.definirOverride(prioridade, request.justificativa().trim(), autor, agora);
        historico.registrarInterno(chamado, TipoEvento.OVERRIDE, "Prioridade alterada manualmente",
                anterior + " → " + prioridade + " · " + request.justificativa().trim(), autor, agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse removerOverride(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        Prioridade anterior = chamado.removerOverride(agora);
        historico.registrarInterno(chamado, TipoEvento.OVERRIDE, "Override removido",
                anterior + " → " + chamado.prioridadeCalculada() + " (prioridade calculada)", autor(usuario), agora);
        return montagem.completo(chamado, false);
    }

    private static void validarPesos(Integer severidade, Integer urgencia) {
        Map<String, String> erros = new LinkedHashMap<>();
        if (!Prioridade.ehPeso(severidade)) {
            erros.put("severidade", "Severidade deve ser 1, 3 ou 5.");
        }
        if (!Prioridade.ehPeso(urgencia)) {
            erros.put("urgencia", "Urgência deve ser 1, 3 ou 5.");
        }
        if (!erros.isEmpty()) {
            throw ErroDeChamado.camposInvalidos(erros);
        }
    }

    private static Prioridade prioridadeValida(String codigo) {
        try {
            return Prioridade.deCodigo(codigo);
        } catch (FiltroChamadoInvalidoException erro) {
            throw ErroDeChamado.campoInvalido("prioridade", "Prioridade inválida.");
        }
    }

    static String descreverClassificacao(TipoChamado tipo, int severidade, int urgencia) {
        int score = Prioridade.score(severidade, urgencia);
        Prioridade prioridade = Prioridade.porScore(score);
        return tipo.getNome() + " · severidade " + Prioridade.rotuloDoPeso(severidade) + " (" + severidade + ") + urgência "
                + Prioridade.rotuloDoPeso(urgencia) + " (" + urgencia + ") = score " + score + " · " + prioridade + " " + prioridade.getRotulo();
    }

    private static String descreverEncaminhamento(TipoChamado tipo, TipoChamado destino, boolean destinoEscolhido, Prioridade prioridade, int urgencia) {
        if (destinoEscolhido || destino == tipo) {
            return "Chamado direcionado para a fila de " + destino.getNome() + ".";
        }
        return prioridade + (urgencia == 5 ? " com urgência imediata" : "")
                + " fora do horário comercial: chamado direcionado ao Plantão da " + destino.getNome() + ".";
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static Autor autor(UsuarioAtual usuario) {
        return new Autor(usuario.id(), usuario.nome());
    }
}
