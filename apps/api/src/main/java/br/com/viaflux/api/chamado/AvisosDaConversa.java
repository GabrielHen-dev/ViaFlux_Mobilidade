package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.operacao.EscalonamentoService;
import br.com.viaflux.api.usuario.Usuario;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class AvisosDaConversa {

    private static final int TAMANHO_DA_PREVIA = 120;
    private static final Set<String> PERFIS_DA_CENTRAL_DE_ATENDIMENTO = Set.of("ATENDENTE");

    private final CanalDeMensagensDoChat canal;
    private final LiderancaRepository usuarios;
    private final AvisoAoSolicitante avisoAoSolicitante;
    private final HistoricoDoChamado historico;

    public AvisosDaConversa(CanalDeMensagensDoChat canal, LiderancaRepository usuarios, AvisoAoSolicitante avisoAoSolicitante, HistoricoDoChamado historico) {
        this.canal = canal;
        this.usuarios = usuarios;
        this.avisoAoSolicitante = avisoAoSolicitante;
        this.historico = historico;
    }

    public void mensagemDaEquipe(Chamado chamado, String texto, Autor autor, OffsetDateTime instante) {
        avisarSolicitante(chamado, texto, autor, instante);
        equipeTratouAConversa(chamado);
    }

    public void mensagemDoSolicitante(Chamado chamado, String texto, Autor autor, OffsetDateTime instante) {
        if (!chamado.pertenceAo(autor.id())) {
            avisarSolicitante(chamado, texto, autor, instante);
        }
        List<UUID> equipe = equipeDoChamado(chamado).stream().filter(id -> !id.equals(autor.id())).toList();
        if (equipe.isEmpty()) {
            historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Notificação não enviada",
                    "Nova mensagem: nenhum usuário ativo para receber o aviso.", Autor.SISTEMA, instante);
            return;
        }
        equipe.forEach(destinatario -> canal.avisarNovaMensagem(destinatario, chamado.getId(), chamado.getCodigo(), previa(texto, autor), instante));
        historico.registrarInterno(chamado, TipoEvento.NOTIFICACAO, "Equipe notificada",
                "Central de notificações do portal · Nova mensagem · " + equipe.size()
                        + (equipe.size() == 1 ? " destinatário" : " destinatários"), Autor.SISTEMA, instante);
    }

    public void equipeTratouAConversa(Chamado chamado) {
        if (chamado.getAtendimentoResponsavel() == null) {
            canal.dispensarEmailsDaEquipe(chamado.getId(), chamado.getSolicitante() == null ? null : chamado.getSolicitante().getId());
        }
    }

    private void avisarSolicitante(Chamado chamado, String texto, Autor autor, OffsetDateTime instante) {
        avisoAoSolicitante.entregar(chamado, CanalDeMensagensDoChat.ASSUNTO_DA_NOTIFICACAO,
                destinatario -> canal.avisarNovaMensagem(destinatario, chamado.getId(), chamado.getCodigo(), previa(texto, autor), instante), instante);
    }

    private List<UUID> equipeDoChamado(Chamado chamado) {
        Autor responsavel = chamado.getAtendimentoResponsavel();
        if (responsavel != null && responsavel.id() != null) {
            return List.of(responsavel.id());
        }
        List<Usuario> daFila = chamado.getDepartamento() == null
                ? List.of()
                : usuarios.ativosDoDepartamento(chamado.getDepartamento().name());
        List<Usuario> equipe = daFila.isEmpty() ? usuarios.ativosComPerfil(PERFIS_DA_CENTRAL_DE_ATENDIMENTO) : daFila;
        List<Usuario> destinatarios = equipe.isEmpty() ? usuarios.ativosComPerfil(EscalonamentoService.PERFIS_DE_CONTINGENCIA) : equipe;
        return destinatarios.stream().map(Usuario::getId).toList();
    }

    private static String previa(String texto, Autor autor) {
        String resumo = texto.length() > TAMANHO_DA_PREVIA ? texto.substring(0, TAMANHO_DA_PREVIA) + "…" : texto;
        return autor.nome() + ": " + resumo;
    }
}
