package br.com.viaflux.api.conta;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
class CaixaDeSaidaSmtp implements CaixaDeSaida {

    private static final Logger log = LoggerFactory.getLogger(CaixaDeSaidaSmtp.class);

    private final JavaMailSender carteiro;
    private final ContaProperties propriedades;

    CaixaDeSaidaSmtp(JavaMailSender carteiro, ContaProperties propriedades) {
        this.carteiro = carteiro;
        this.propriedades = propriedades;
    }

    @Override
    public void enviar(Mensagem mensagem) {
        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(propriedades.remetente());
        email.setTo(mensagem.para());
        email.setSubject(mensagem.assunto());
        email.setText(mensagem.texto());
        try {
            carteiro.send(email);
        } catch (MailException falhaNoEnvio) {
            log.warn("Não foi possível enviar o e-mail \"{}\": {}", mensagem.assunto(), falhaNoEnvio.getMessage());
        }
    }
}
