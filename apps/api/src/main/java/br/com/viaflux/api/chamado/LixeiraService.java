package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;

@Service
class LixeiraService {

    private final ChamadoRepository chamados;
    private final ChamadoAnexoRepository anexos;
    private final AcessoAosChamados acesso;
    private final ArmazenamentoDeArquivos armazenamento;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    LixeiraService(
            ChamadoRepository chamados,
            ChamadoAnexoRepository anexos,
            AcessoAosChamados acesso,
            ArmazenamentoDeArquivos armazenamento,
            MontagemDeChamado montagem,
            Clock relogio
    ) {
        this.chamados = chamados;
        this.anexos = anexos;
        this.acesso = acesso;
        this.armazenamento = armazenamento;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    void moverParaLixeira(String codigo, UsuarioAtual usuario) {
        acesso.paraConduzir(codigo, usuario).moverParaLixeira(OffsetDateTime.now(relogio));
    }

    @Transactional(readOnly = true)
    List<ChamadoResumoResponse> listar() {
        return chamados.findByExcluidoEmIsNotNullOrderByExcluidoEmDesc().stream().map(montagem::resumo).toList();
    }

    @Transactional
    ChamadoResponse restaurar(String codigo) {
        Chamado chamado = acesso.naLixeira(codigo);
        chamado.restaurar();
        return montagem.completo(chamado, false);
    }

    @Transactional
    void excluirDefinitivamente(String codigo) {
        apagar(List.of(acesso.naLixeira(codigo)));
    }

    @Transactional
    void esvaziar() {
        apagar(chamados.findByExcluidoEmIsNotNullOrderByExcluidoEmDesc());
    }

    private void apagar(List<Chamado> naLixeira) {
        if (naLixeira.isEmpty()) {
            return;
        }
        List<String> arquivos = anexos.findByChamadoIdIn(naLixeira.stream().map(Chamado::getId).toList()).stream()
                .map(ChamadoAnexo::getArquivo)
                .toList();
        chamados.deleteAll(naLixeira);
        chamados.flush();
        arquivos.forEach(armazenamento::remover);
    }
}
