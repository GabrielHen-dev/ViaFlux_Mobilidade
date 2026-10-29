package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

@Service
class EscalonamentoService {

    static final String STATUS_DA_NOTIFICACAO = "Escalonado";
    static final Set<String> PERFIS_DA_LIDERANCA = Set.of("LIDER_OPERACIONAL");
    static final Set<String> PERFIS_DE_CONTINGENCIA = Set.of("ADMIN");

    private final AcessoAosChamados acesso;
    private final PoliticaDeSla politicaDeSla;
    private final LiderancaRepository lideranca;
    private final CanalDeNotificacao canal;
    private final HistoricoDoChamado historico;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    EscalonamentoService(AcessoAosChamados acesso, PoliticaDeSla politicaDeSla, LiderancaRepository lideranca,
                         CanalDeNotificacao canal, HistoricoDoChamado historico, MontagemDeChamado montagem, Clock relogio) {
        this.acesso = acesso;
        this.politicaDeSla = politicaDeSla;
        this.lideranca = lideranca;
        this.canal = canal;
        this.historico = historico;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    ChamadoResponse escalonar(String codigo, EscalonamentoRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraAtender(codigo, usuario);
        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        SlaResponse sla = politicaDeSla.avaliar(chamado, agora.toInstant());
        if (!slaViolado(sla)) {
            throw ErroDeChamado.conflito("Só é possível escalonar chamados com prazo de SLA vencido.");
        }
        Autor autor = new Autor(usuario.id(), usuario.nome());
        String observacao = request == null ? null : request.observacao();
        chamado.escalonar(autor, observacao, agora);

        List<Usuario> destinatarios = lideranca.ativosComPerfil(PERFIS_DA_LIDERANCA);
        if (destinatarios.isEmpty()) {
            destinatarios = lideranca.ativosComPerfil(PERFIS_DE_CONTINGENCIA);
        }
        String mensagem = "O chamado " + chamado.getCodigo() + " está com o SLA vencido e foi escalonado por " + autor.nome()
                + (chamado.getEscalonamentoMotivo() == null ? "." : ": " + chamado.getEscalonamentoMotivo());
        destinatarios.stream()
                .filter(destinatario -> !destinatario.getId().equals(usuario.id()))
                .forEach(destinatario -> canal.enviar(destinatario.getId(), chamado.getId(), chamado.getCodigo(),
                        STATUS_DA_NOTIFICACAO, mensagem, agora));

        String notificados = destinatarios.isEmpty()
                ? "nenhum líder ativo cadastrado"
                : destinatarios.size() + (destinatarios.size() == 1 ? " responsável notificado" : " responsáveis notificados");
        historico.registrarInterno(chamado, TipoEvento.ESCALONAMENTO, "Chamado escalonado à liderança",
                (chamado.getEscalonamentoMotivo() == null ? "SLA vencido" : "SLA vencido · " + chamado.getEscalonamentoMotivo())
                        + " · " + notificados,
                autor, agora);
        return montagem.completo(chamado, false);
    }

    static boolean slaViolado(SlaResponse sla) {
        return sla != null && Stream.of(sla.primeiraResposta(), sla.resolucao())
                .anyMatch(prazo -> prazo.cumpridoEm() == null && prazo.situacao() == SituacaoPrazo.VIOLADO);
    }
}
