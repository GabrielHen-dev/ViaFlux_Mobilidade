package br.com.viaflux.api.chamado.metricas;


import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.ChamadoResumoResponse;
import br.com.viaflux.api.chamado.servico.ServicoTerceiro;
import java.time.Duration;
import java.util.Optional;

public record LinhaDeMetrica(
        Chamado chamado,
        ChamadoResumoResponse resumo,
        boolean reclassificado,
        boolean comOverride,
        Optional<ServicoTerceiro> servico
) {

    public Optional<Long> minutosAteResolver() {
        return Optional.ofNullable(chamado.getResolvidoEm())
                .map(resolvido -> Duration.between(chamado.getAbertoEm(), resolvido).toMinutes());
    }

    public Optional<Long> minutosAteTriar() {
        return Optional.ofNullable(chamado.getTriadoEm())
                .map(triado -> Duration.between(chamado.getAbertoEm(), triado).toMinutes());
    }

    public boolean rastreavel() {
        return chamado.getMotivo() != null && chamado.getContexto() != null && chamado.triado();
    }
}
