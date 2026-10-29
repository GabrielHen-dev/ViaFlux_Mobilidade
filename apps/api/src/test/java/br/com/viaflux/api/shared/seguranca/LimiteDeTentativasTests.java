package br.com.viaflux.api.shared.seguranca;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class LimiteDeTentativasTests {

    private static final Instant INICIO = Instant.parse("2026-10-29T12:00:00Z");

    private final RelogioAjustavel relogio = new RelogioAjustavel(INICIO);
    private final LimiteDeTentativas limite = new LimiteDeTentativas(5, Duration.ofMinutes(15), relogio);

    @Test
    void bloqueiaASextaTentativaDentroDaJanelaEInformaQuandoTentarDeNovo() {
        for (int tentativa = 0; tentativa < 5; tentativa++) {
            limite.consumir("cadastro:ana@exemplo.com");
        }
        relogio.avancar(Duration.ofMinutes(5));

        ResponseStatusException erro = catchThrowableOfType(ResponseStatusException.class,
                () -> limite.consumir("cadastro:ana@exemplo.com"));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(erro.getReason()).isEqualTo("Muitas tentativas seguidas. Tente de novo em 10 minutos.");
    }

    @Test
    void liberaQuandoAsTentativasAntigasSaemDaJanela() {
        for (int tentativa = 0; tentativa < 5; tentativa++) {
            limite.consumir("login:ana@exemplo.com");
        }
        relogio.avancar(Duration.ofMinutes(15));

        assertThatCode(() -> limite.consumir("login:ana@exemplo.com")).doesNotThrowAnyException();
    }

    @Test
    void chavesDiferentesNaoSeAfetamEEsquecerZeraOContador() {
        for (int tentativa = 0; tentativa < 5; tentativa++) {
            limite.registrar("login:ana@exemplo.com");
        }

        assertThatCode(() -> limite.exigirDisponivel("login:bruno@exemplo.com")).doesNotThrowAnyException();
        limite.esquecer("login:ana@exemplo.com");
        assertThatCode(() -> limite.exigirDisponivel("login:ana@exemplo.com")).doesNotThrowAnyException();
    }

    private static final class RelogioAjustavel extends Clock {

        private Instant agora;

        RelogioAjustavel(Instant agora) {
            this.agora = agora;
        }

        void avancar(Duration intervalo) {
            agora = agora.plus(intervalo);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }
}
