package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
class ResponsavelPeloAtendimentoService {

    static final String PERFIL_DA_EQUIPE = "DEPARTAMENTO";
    static final String STATUS_DA_NOTIFICACAO = "Transferido para você";

    private final AcessoAosChamados acesso;
    private final EquipeDoDepartamentoRepository equipe;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final CanalDeNotificacao canal;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    ResponsavelPeloAtendimentoService(AcessoAosChamados acesso, EquipeDoDepartamentoRepository equipe, HistoricoDoChamado historico,
                                      AvisoAoSolicitante aviso, CanalDeNotificacao canal, MontagemDeChamado montagem, Clock relogio) {
        this.acesso = acesso;
        this.equipe = equipe;
        this.historico = historico;
        this.aviso = aviso;
        this.canal = canal;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional(readOnly = true)
    List<Autor> pessoasDoSetor(String codigo, UsuarioAtual usuario) {
        return equipeDoChamado(acesso.paraAtender(codigo, usuario)).stream()
                .map(pessoa -> new Autor(pessoa.getId(), pessoa.getNome()))
                .toList();
    }

    @Transactional
    ChamadoResponse transferir(String codigo, TransferenciaDeResponsavelRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraAtender(codigo, usuario);
        Usuario pessoa = equipeDoChamado(chamado).stream()
                .filter(candidato -> candidato.getId().equals(request.usuarioId()))
                .findFirst()
                .orElseThrow(() -> ErroDeChamado.campoInvalido("usuarioId",
                        "Escolha uma pessoa ativa do departamento responsável pelo chamado."));
        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        Autor autor = new Autor(usuario.id(), usuario.nome());
        Autor novo = new Autor(pessoa.getId(), pessoa.getNome());
        StatusChamado statusAnterior = chamado.getStatus();
        Autor anterior = chamado.transferirResponsavel(novo, agora);

        String observacao = request.observacao() == null || request.observacao().isBlank() ? "" : " · " + request.observacao().trim();
        historico.registrarInterno(chamado, TipoEvento.TRANSFERENCIA, "Responsável transferido",
                (anterior == null ? "Sem responsável" : anterior.nome()) + " → " + novo.nome() + observacao, autor, agora);
        if (statusAnterior != chamado.getStatus()) {
            String rotulo = chamado.getStatus().getRotulo();
            historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Status alterado para " + rotulo,
                    statusAnterior.getRotulo() + " → " + rotulo + " · atribuído a " + novo.nome(), autor, agora);
            aviso.avisar(chamado, rotulo, "O chamado " + chamado.getCodigo() + " mudou para " + rotulo + ".", agora);
        }
        if (!novo.id().equals(usuario.id())) {
            canal.enviar(novo.id(), chamado.getId(), chamado.getCodigo(), STATUS_DA_NOTIFICACAO,
                    usuario.nome() + " transferiu o chamado " + chamado.getCodigo() + " para você" + observacao, agora);
        }
        return montagem.completo(chamado, false);
    }

    private List<Usuario> equipeDoChamado(Chamado chamado) {
        chamado.exigirTriagemConcluida();
        if (chamado.getDepartamento() == null) {
            return List.of();
        }
        return equipe.ativosComPerfilNoDepartamento(PERFIL_DA_EQUIPE, chamado.getDepartamento().name());
    }
}
