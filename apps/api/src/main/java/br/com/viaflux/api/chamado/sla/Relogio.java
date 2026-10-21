package br.com.viaflux.api.chamado.sla;

import java.time.Instant;

public interface Relogio {

    double minutosEntre(Instant inicio, Instant fim);

    Instant somarMinutos(Instant inicio, double minutos);
}
