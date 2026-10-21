package br.com.viaflux.api.chamado.sla;

import java.time.Duration;
import java.time.Instant;

public final class RelogioCorrido implements Relogio {

    private static final double MILISSEGUNDOS_POR_MINUTO = 60_000d;

    @Override
    public double minutosEntre(Instant inicio, Instant fim) {
        return Math.max(0, Duration.between(inicio, fim).toMillis() / MILISSEGUNDOS_POR_MINUTO);
    }

    @Override
    public Instant somarMinutos(Instant inicio, double minutos) {
        return inicio.plusMillis(Math.round(minutos * MILISSEGUNDOS_POR_MINUTO));
    }
}
