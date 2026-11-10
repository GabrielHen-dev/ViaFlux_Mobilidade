package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
class CancelamentoService {

    private final AcessoAosChamados acesso;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    CancelamentoService(AcessoAosChamados acesso, HistoricoDoChamado historico, AvisoAoSolicitante aviso, MontagemDeChamado montagem,
                        Clock relogio) {
        this.acesso = acesso;
        this.historico = historico;
        this.aviso = aviso;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    ChamadoResponse cancelar(String codigo, CancelamentoRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        StatusChamado anterior = chamado.getStatus();
        String motivo = request.motivo().trim();
        chamado.cancelar(autor(usuario), motivo, agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Chamado cancelado",
                anterior.getRotulo() + " → " + StatusChamado.CANCELADO.getRotulo() + " · Motivo: " + motivo, autor(usuario), agora);
        aviso.avisar(chamado, StatusChamado.CANCELADO.getRotulo(), "O chamado " + chamado.getCodigo() + " foi cancelado. Motivo: " + motivo
                + ". Se o cancelamento foi indevido, você pode reabrir o chamado pelo portal.", agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse reabrir(String codigo, ReaberturaDoCancelamentoRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        if (!usuario.apenasCliente() && !acesso.podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Seu perfil só acompanha este chamado.");
        }
        OffsetDateTime agora = agora();
        StatusChamado novo = chamado.reabrirCancelado(agora);
        String quem = usuario.apenasCliente() ? "pelo solicitante" : "por " + usuario.nome();
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Chamado reaberto após cancelamento",
                StatusChamado.CANCELADO.getRotulo() + " → " + novo.getRotulo() + " · reaberto " + quem + " · " + request.motivo().trim(),
                autor(usuario), agora);
        aviso.avisar(chamado, novo.getRotulo(), "O chamado " + chamado.getCodigo() + " foi reaberto e voltou para " + novo.getRotulo() + ".", agora);
        return montagem.completo(chamado, usuario.apenasCliente());
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static Autor autor(UsuarioAtual usuario) {
        return new Autor(usuario.id(), usuario.nome());
    }
}
