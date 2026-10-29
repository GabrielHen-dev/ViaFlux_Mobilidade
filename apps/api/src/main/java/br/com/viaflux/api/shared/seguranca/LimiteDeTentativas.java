package br.com.viaflux.api.shared.seguranca;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LimiteDeTentativas {

    private final int maximo;
    private final Duration janela;
    private final Clock relogio;
    private final Map<String, Deque<Instant>> tentativas = new ConcurrentHashMap<>();

    public LimiteDeTentativas(int maximo, Duration janela, Clock relogio) {
        this.maximo = maximo;
        this.janela = janela;
        this.relogio = relogio;
    }

    public void exigirDisponivel(String chave) {
        Instant agora = relogio.instant();
        Deque<Instant> registradas = tentativas.get(chave);
        if (registradas == null) {
            return;
        }
        synchronized (registradas) {
            descartarVencidas(registradas, agora);
            if (registradas.size() >= maximo) {
                Duration espera = Duration.between(agora, registradas.peekFirst().plus(janela));
                long minutos = Math.max(1, (espera.toSeconds() + 59) / 60);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Muitas tentativas seguidas. Tente de novo em " + minutos + (minutos == 1 ? " minuto." : " minutos."));
            }
        }
    }

    public void registrar(String chave) {
        Instant agora = relogio.instant();
        Deque<Instant> registradas = tentativas.computeIfAbsent(chave, ignorada -> new ArrayDeque<>());
        synchronized (registradas) {
            descartarVencidas(registradas, agora);
            registradas.addLast(agora);
        }
    }

    public void consumir(String chave) {
        exigirDisponivel(chave);
        registrar(chave);
    }

    public void esquecer(String chave) {
        tentativas.remove(chave);
    }

    private void descartarVencidas(Deque<Instant> registradas, Instant agora) {
        Instant limite = agora.minus(janela);
        while (!registradas.isEmpty() && !registradas.peekFirst().isAfter(limite)) {
            registradas.removeFirst();
        }
    }
}
