package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class AcessoDoDestinatarioAoChamado implements AcessoDoDestinatario {

    private final ChamadoRepository chamados;
    private final AcessoAosChamados acesso;
    private final IdentificacaoDoUsuario identificacao;

    public AcessoDoDestinatarioAoChamado(ChamadoRepository chamados, AcessoAosChamados acesso, IdentificacaoDoUsuario identificacao) {
        this.chamados = chamados;
        this.acesso = acesso;
        this.identificacao = identificacao;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean podeVerChamado(UUID usuarioId, UUID chamadoId) {
        return chamados.findById(chamadoId)
                .filter(chamado -> !chamado.naLixeira())
                .flatMap(chamado -> identificacao.ativoPorId(usuarioId).map(usuario -> acesso.podeVer(chamado, usuario)))
                .orElse(false);
    }
}
