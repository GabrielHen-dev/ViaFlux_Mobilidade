package br.com.viaflux.api.shared.email;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;

class CaixaDeSaidaSmtpTests {

    private static final CaixaDeSaida.Mensagem MENSAGEM = new CaixaDeSaida.Mensagem("lia@exemplo.com", "Chamado VF-0001: SLA violado", "Texto", null);

    private final JavaMailSender carteiro = mock(JavaMailSender.class);
    private final CaixaDeSaida caixa = new CaixaDeSaidaSmtp(carteiro, "ViaFlux <nao-responda@viaflux.local>");

    @BeforeEach
    void prepararMensagem() {
        given(carteiro.createMimeMessage()).willReturn(new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    void tentarEnviarInformaQueOEmailFoiEntregue() {
        willDoNothing().given(carteiro).send(any(MimeMessage.class));

        assertThat(caixa.tentarEnviar(MENSAGEM)).isTrue();
    }

    @Test
    void tentarEnviarInformaAFalhaParaQuemPrecisaRegistrarANovaTentativa() {
        willThrow(new MailSendException("SMTP indisponível")).given(carteiro).send(any(MimeMessage.class));

        assertThat(caixa.tentarEnviar(MENSAGEM)).isFalse();
    }

    @Test
    void enviarContinuaSemPropagarAFalha() {
        willThrow(new MailSendException("SMTP indisponível")).given(carteiro).send(any(MimeMessage.class));

        assertThatCode(() -> caixa.enviar(MENSAGEM)).doesNotThrowAnyException();
    }
}
