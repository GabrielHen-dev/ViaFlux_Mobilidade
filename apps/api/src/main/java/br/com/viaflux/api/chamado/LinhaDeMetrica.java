package br.com.viaflux.api.chamado;

import java.time.Duration;
import java.util.Optional;

record LinhaDeMetrica(
        Chamado chamado,
        ChamadoResumoResponse resumo,
        boolean reclassificado,
        boolean comOverride,
        Optional<ServicoTerceiro> servico
) {

    Optional<Long> minutosAteResolver() {
        return Optional.ofNullable(chamado.getResolvidoEm())
                .map(resolvido -> Duration.between(chamado.getAbertoEm(), resolvido).toMinutes());
    }

    Optional<Long> minutosAteTriar() {
        return Optional.ofNullable(chamado.getTriadoEm())
                .map(triado -> Duration.between(chamado.getAbertoEm(), triado).toMinutes());
    }

    boolean rastreavel() {
        return chamado.getMotivo() != null && chamado.getContexto() != null && chamado.triado();
    }
}
