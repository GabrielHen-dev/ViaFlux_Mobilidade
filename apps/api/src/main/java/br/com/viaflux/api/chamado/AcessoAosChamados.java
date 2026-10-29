package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Component
class AcessoAosChamados {

    private final ChamadoRepository chamados;
    AcessoAosChamados(ChamadoRepository chamados) {
        this.chamados = chamados;
    }

    boolean podeVer(Chamado chamado, UsuarioAtual usuario) {
        if (usuario.visaoGlobal()) {
            return true;
        }
        if (chamado.getDepartamento() != null && usuario.atuaNoDepartamento(chamado.getDepartamento().name())) {
            return true;
        }
        if (usuario.perfis().contains("GESTOR_FROTA") && chamado.getSolicitante() != null
                && usuario.organizacaoId() != null && chamado.getSolicitante().getOrganizacao() != null
                && usuario.organizacaoId().equals(chamado.getSolicitante().getOrganizacao().getId())) {
            return true;
        }
        return usuario.temAlgum(UsuarioAtual.PERFIS_DE_CLIENTE) && chamado.pertenceAo(usuario.id());
    }

    boolean podeConduzir(Chamado chamado, UsuarioAtual usuario) {
        return usuario.conduzQualquerFila() || naFilaDoUsuario(chamado, usuario);
    }

    boolean podeAtender(Chamado chamado, UsuarioAtual usuario) {
        return usuario.atendeQualquerFila() || naFilaDoUsuario(chamado, usuario);
    }

    private static boolean naFilaDoUsuario(Chamado chamado, UsuarioAtual usuario) {
        return chamado.getDepartamento() != null && usuario.atuaNoDepartamento(chamado.getDepartamento().name());
    }

    Chamado visivel(String codigo, UsuarioAtual usuario) {
        return chamados.findByCodigo(codigo)
                .filter(chamado -> !chamado.naLixeira())
                .filter(chamado -> podeVer(chamado, usuario))
                .orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
    }

    Chamado paraConduzir(String codigo, UsuarioAtual usuario) {
        Chamado chamado = visivel(codigo, usuario);
        if (!podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Seu perfil só acompanha este chamado.");
        }
        return chamado;
    }

    Chamado paraAtender(String codigo, UsuarioAtual usuario) {
        Chamado chamado = visivel(codigo, usuario);
        if (!podeAtender(chamado, usuario)) {
            throw ErroDeChamado.proibido("Só o departamento responsável pelo chamado assume e muda o status do atendimento.");
        }
        return chamado;
    }

    Chamado paraOSolicitante(String codigo, UsuarioAtual usuario) {
        Chamado chamado = visivel(codigo, usuario);
        if (!usuario.temAlgum(UsuarioAtual.PERFIS_DE_CLIENTE)) {
            throw ErroDeChamado.proibido("Só o solicitante confirma, contesta ou reabre o chamado.");
        }
        return chamado;
    }

    Chamado naLixeira(String codigo) {
        return chamados.findByCodigo(codigo)
                .filter(Chamado::naLixeira)
                .orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
    }

    List<Chamado> visiveis(UsuarioAtual usuario, String busca) {
        String termo = busca == null || busca.isBlank() ? null : "%" + busca.trim().toLowerCase(Locale.ROOT) + "%";
        return chamados.buscarAtivos(termo).stream()
                .filter(chamado -> podeVer(chamado, usuario))
                .toList();
    }
}
