package br.com.viaflux.api.endereco;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;

class LimitadorDeRequisicoes {

    @FunctionalInterface
    interface Espera {
        void aguardar(long nanossegundos) throws InterruptedException;
    }

    private final long intervaloEmNanos;
    private final LongSupplier relogioEmNanos;
    private final Espera espera;
    private long proximaLiberacao;
    private boolean jaLiberou;

    LimitadorDeRequisicoes(Duration intervalo, LongSupplier relogioEmNanos, Espera espera) {
        this.intervaloEmNanos = intervalo.toNanos();
        this.relogioEmNanos = relogioEmNanos;
        this.espera = espera;
    }

    static LimitadorDeRequisicoes umaPorSegundo() {
        return new LimitadorDeRequisicoes(Duration.ofSeconds(1), System::nanoTime, TimeUnit.NANOSECONDS::sleep);
    }

    synchronized void aguardarVez() throws InterruptedException {
        long agora = relogioEmNanos.getAsLong();
        if (jaLiberou && agora - proximaLiberacao < 0) {
            espera.aguardar(proximaLiberacao - agora);
            agora = Math.max(relogioEmNanos.getAsLong(), proximaLiberacao);
        }
        proximaLiberacao = agora + intervaloEmNanos;
        jaLiberou = true;
    }
}
