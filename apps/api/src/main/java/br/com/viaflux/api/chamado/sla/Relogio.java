package br.com.viaflux.api.chamado.sla;

import java.time.Instant;

public interface Relogio {

    public double minutosEntre(Instant inicio, Instant fim);

    public Instant somarMinutos(Instant inicio, double minutos);
}
