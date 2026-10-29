package br.com.viaflux.api.shared.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
class CaixaDeSaidaSmtp implements CaixaDeSaida {

    private static final Logger log = LoggerFactory.getLogger(CaixaDeSaidaSmtp.class);

    private final JavaMailSender carteiro;
    private final String remetente;

    CaixaDeSaidaSmtp(JavaMailSender carteiro, @Value("${viaflux.conta.remetente}") String remetente) {
        this.carteiro = carteiro;
        this.remetente = remetente;
    }

    @Override
    public void enviar(Mensagem mensagem) {
        try {
            MimeMessage email = carteiro.createMimeMessage();
            MimeMessageHelper montagem = new MimeMessageHelper(email, true, StandardCharsets.UTF_8.name());
            montagem.setFrom(remetente);
            montagem.setTo(mensagem.para());
            montagem.setSubject(mensagem.assunto());
            if (mensagem.html() == null) {
                montagem.setText(mensagem.texto());
            } else {
                montagem.setText(mensagem.texto(), mensagem.html());
            }
            carteiro.send(email);
        } catch (MailException | MessagingException falhaNoEnvio) {
            log.warn("Não foi possível enviar o e-mail \"{}\": {}", mensagem.assunto(), falhaNoEnvio.getMessage());
        }
    }
}
