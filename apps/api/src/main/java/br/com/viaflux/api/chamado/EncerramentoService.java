package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
class EncerramentoService {

    private final AcessoAosChamados acesso;
    private final ChamadoRepository chamados;
    private final JanelaDeEncerramento janela;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    EncerramentoService(AcessoAosChamados acesso, ChamadoRepository chamados, JanelaDeEncerramento janela, HistoricoDoChamado historico,
                        AvisoAoSolicitante aviso, MontagemDeChamado montagem, Clock relogio) {
        this.acesso = acesso;
        this.chamados = chamados;
        this.janela = janela;
        this.historico = historico;
        this.aviso = aviso;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    ChamadoResponse confirmar(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraOSolicitante(codigo, usuario);
        OffsetDateTime agora = agora();
        chamado.confirmarResolucao(agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Solução confirmada pelo solicitante",
                "Resolvido → Fechado · confirmado por " + usuario.nome(), autor(usuario), agora);
        aviso.avisar(chamado, StatusChamado.FECHADO.getRotulo(),
                "O chamado " + chamado.getCodigo() + " foi fechado com a sua confirmação.", agora);
        return montagem.completo(chamado, true);
    }

    @Transactional
    ChamadoResponse contestar(String codigo, MotivoDoSolicitanteRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraOSolicitante(codigo, usuario);
        OffsetDateTime agora = agora();
        chamado.contestarResolucao(agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Solução contestada pelo solicitante",
                "Resolvido → " + chamado.getStatus().getRotulo() + " · " + request.motivo().trim(), autor(usuario), agora);
        aviso.avisar(chamado, chamado.getStatus().getRotulo(),
                "Recebemos a sua contestação e o chamado " + chamado.getCodigo() + " voltou para atendimento.", agora);
        return montagem.completo(chamado, true);
    }

    @Transactional
    ChamadoResponse reabrir(String codigo, MotivoDoSolicitanteRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraOSolicitante(codigo, usuario);
        OffsetDateTime agora = agora();
        Instant limite = janela.reaberturaAte(chamado);
        if (limite != null && agora.toInstant().isAfter(limite)) {
            throw ErroDeChamado.conflito("O prazo de " + JanelaDeEncerramento.DIAS_UTEIS_PARA_REABRIR
                    + " dias úteis para reabrir terminou. Abra um novo chamado citando o protocolo " + chamado.getCodigo() + ".");
        }
        chamado.reabrir(agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Chamado reaberto pelo solicitante",
                "Fechado → Na fila · episódio " + chamado.getEpisodio() + " · " + request.motivo().trim(), autor(usuario), agora);
        aviso.avisar(chamado, StatusChamado.NA_FILA.getRotulo(),
                "O chamado " + chamado.getCodigo() + " foi reaberto e voltou para a fila de atendimento.", agora);
        return montagem.completo(chamado, true);
    }

    @Transactional
    void processarPrazosDeConfirmacao() {
        OffsetDateTime agora = agora();
        for (Chamado chamado : chamados.findByStatusAndExcluidoEmIsNull(StatusChamado.RESOLVIDO)) {
            Instant limite = janela.confirmacaoAte(chamado);
            Instant lembrete = janela.lembreteEm(chamado);
            if (limite != null && !agora.toInstant().isBefore(limite)) {
                fecharSemResposta(chamado, agora);
            } else if (lembrete != null && !agora.toInstant().isBefore(lembrete) && chamado.getLembreteConfirmacaoEm() == null) {
                lembrarDaConfirmacao(chamado, limite, agora);
            }
        }
    }

    private void fecharSemResposta(Chamado chamado, OffsetDateTime agora) {
        chamado.fecharAutomaticamente(agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Fechado automaticamente",
                "Resolvido → Fechado · sem resposta do solicitante em " + JanelaDeEncerramento.DIAS_UTEIS_PARA_CONFIRMAR + " dias úteis",
                Autor.SISTEMA, agora);
        aviso.avisar(chamado, StatusChamado.FECHADO.getRotulo(), "O chamado " + chamado.getCodigo()
                + " foi fechado. Se o problema voltar, você pode reabri-lo em até " + JanelaDeEncerramento.DIAS_UTEIS_PARA_REABRIR
                + " dias úteis.", agora);
    }

    private void lembrarDaConfirmacao(Chamado chamado, Instant limite, OffsetDateTime agora) {
        chamado.registrarLembreteDeConfirmacao(agora);
        aviso.avisar(chamado, StatusChamado.RESOLVIDO.getRotulo(), "Confirme se o chamado " + chamado.getCodigo()
                + " foi resolvido. Sem resposta, ele será fechado em " + Datas.local(limite).toLocalDate() + ".", agora);
    }

    private static Autor autor(UsuarioAtual usuario) {
        return new Autor(usuario.id(), usuario.nome());
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }
}
