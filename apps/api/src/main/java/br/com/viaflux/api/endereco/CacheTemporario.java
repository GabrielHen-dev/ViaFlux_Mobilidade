package br.com.viaflux.api.endereco;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

class CacheTemporario<V> {

    private record Entrada<V>(V valor, Instant expiraEm) {
    }

    private final Duration validade;
    private final Clock relogio;
    private final LinkedHashMap<String, Entrada<V>> entradas;

    CacheTemporario(int capacidade, Duration validade, Clock relogio) {
        this.validade = validade;
        this.relogio = relogio;
        this.entradas = new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Entrada<V>> maisAntiga) {
                return size() > capacidade;
            }
        };
    }

    synchronized Optional<V> buscar(String chave) {
        Entrada<V> entrada = entradas.get(chave);
        if (entrada == null) {
            return Optional.empty();
        }
        if (!relogio.instant().isBefore(entrada.expiraEm())) {
            entradas.remove(chave);
            return Optional.empty();
        }
        return Optional.of(entrada.valor());
    }

    synchronized void guardar(String chave, V valor) {
        entradas.put(chave, new Entrada<>(valor, relogio.instant().plus(validade)));
    }

    synchronized int tamanho() {
        return entradas.size();
    }
}
