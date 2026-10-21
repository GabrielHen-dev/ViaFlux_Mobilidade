package br.com.viaflux.api.endereco;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class EnderecoCacheELimitadorTests {

    @Test
    void cacheDropsTheLeastRecentlyUsedEntryWhenFull() {
        CacheTemporario<String> cache = new CacheTemporario<>(2, Duration.ofHours(1),
                Clock.fixed(Instant.parse("2026-10-20T12:00:00Z"), ZoneOffset.UTC));

        cache.guardar("a", "A");
        cache.guardar("b", "B");
        cache.buscar("a");
        cache.guardar("c", "C");

        assertThat(cache.tamanho()).isEqualTo(2);
        assertThat(cache.buscar("a")).contains("A");
        assertThat(cache.buscar("b")).isEmpty();
        assertThat(cache.buscar("c")).contains("C");
    }

    @Test
    void limiterOnlyWaitsForWhatIsLeftOfTheInterval() throws InterruptedException {
        AtomicLong agora = new AtomicLong(5_000_000_000L);
        List<Long> esperas = new ArrayList<>();
        LimitadorDeRequisicoes limitador = new LimitadorDeRequisicoes(Duration.ofSeconds(1), agora::get, nanos -> {
            esperas.add(nanos);
            agora.addAndGet(nanos);
        });

        limitador.aguardarVez();
        agora.addAndGet(Duration.ofMillis(400).toNanos());
        limitador.aguardarVez();
        agora.addAndGet(Duration.ofSeconds(3).toNanos());
        limitador.aguardarVez();

        assertThat(esperas).containsExactly(Duration.ofMillis(600).toNanos());
    }
}
