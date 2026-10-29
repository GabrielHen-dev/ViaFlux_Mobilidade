package br.com.viaflux.api.conta;

import br.com.viaflux.api.usuario.Usuario;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
class MensagensDeConta {

    static final String CAMINHO_DA_VERIFICACAO = "/verificar-email";
    static final String CAMINHO_DA_REDEFINICAO = "/redefinir-senha";

    private final ContaProperties propriedades;

    MensagensDeConta(ContaProperties propriedades) {
        this.propriedades = propriedades;
    }

    CaixaDeSaida.Mensagem verificacao(Usuario usuario, String token) {
        return new CaixaDeSaida.Mensagem(usuario.getEmail(), "Confirme seu e-mail no ViaFlux", """
                Olá, %s.

                Para ativar sua conta e abrir chamados no portal ViaFlux, confirme seu e-mail pelo link abaixo:

                %s

                O link vale por %s e só pode ser usado uma vez. Se você não criou esta conta, ignore esta mensagem.
                """.formatted(usuario.getNome(), propriedades.linkPara(CAMINHO_DA_VERIFICACAO, token),
                descrever(propriedades.validadeDaVerificacao())));
    }

    CaixaDeSaida.Mensagem cadastroRepetido(Usuario usuario) {
        return new CaixaDeSaida.Mensagem(usuario.getEmail(), "Tentativa de cadastro com o seu e-mail", """
                Olá, %s.

                Alguém tentou criar uma conta no portal ViaFlux com este e-mail, que já está cadastrado.
                Se foi você, entre normalmente ou use "Esqueci minha senha" em %s/esqueci-a-senha.
                Se não foi você, nenhuma ação é necessária: sua conta continua protegida.
                """.formatted(usuario.getNome(), base()));
    }

    CaixaDeSaida.Mensagem redefinicao(Usuario usuario, String token) {
        return new CaixaDeSaida.Mensagem(usuario.getEmail(), "Redefinição de senha do ViaFlux", """
                Olá, %s.

                Recebemos um pedido para redefinir a senha da sua conta. Para criar uma senha nova, use o link abaixo:

                %s

                O link vale por %s e só pode ser usado uma vez. Se você não pediu a redefinição, ignore esta mensagem:
                sua senha atual continua valendo.
                """.formatted(usuario.getNome(), propriedades.linkPara(CAMINHO_DA_REDEFINICAO, token),
                descrever(propriedades.validadeDaRedefinicao())));
    }

    CaixaDeSaida.Mensagem senhaAlterada(Usuario usuario) {
        return new CaixaDeSaida.Mensagem(usuario.getEmail(), "Sua senha do ViaFlux foi alterada", """
                Olá, %s.

                A senha da sua conta no portal ViaFlux acabou de ser alterada, e as sessões abertas foram encerradas.
                Se não foi você, peça uma nova redefinição em %s/esqueci-a-senha e avise a Central ViaFlux.
                """.formatted(usuario.getNome(), base()));
    }

    private String base() {
        String url = propriedades.portalUrl();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String descrever(Duration validade) {
        long horas = validade.toHours();
        if (horas >= 1 && validade.toMinutesPart() == 0) {
            return horas + (horas == 1 ? " hora" : " horas");
        }
        long minutos = validade.toMinutes();
        return minutos + (minutos == 1 ? " minuto" : " minutos");
    }
}
