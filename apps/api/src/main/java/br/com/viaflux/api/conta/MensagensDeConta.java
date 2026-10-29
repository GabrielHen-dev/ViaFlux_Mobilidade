package br.com.viaflux.api.conta;

import br.com.viaflux.api.shared.email.CaixaDeSaida;
import br.com.viaflux.api.shared.email.ModelosDeEmail;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.Usuario;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
class MensagensDeConta {

    static final String CAMINHO_DA_VERIFICACAO = "/verificar-email";
    static final String CAMINHO_DA_REDEFINICAO = "/redefinir-senha";
    static final String CAMINHO_DO_CONVITE = "/aceitar-convite";
    static final String CAMINHO_DO_LOGIN = "/login";
    static final String CAMINHO_DA_RECUPERACAO = "/esqueci-a-senha";

    private final ContaProperties propriedades;
    private final ModelosDeEmail modelos;

    MensagensDeConta(ContaProperties propriedades, ModelosDeEmail modelos) {
        this.propriedades = propriedades;
        this.modelos = modelos;
    }

    CaixaDeSaida.Mensagem verificacao(Usuario usuario, String token) {
        return modelos.montar(usuario.getEmail(), "verificacao", "Confirme seu e-mail", "Confirme seu e-mail",
                "Confirmar e-mail", propriedades.linkPara(CAMINHO_DA_VERIFICACAO, token),
                Map.of("nome", usuario.getNome(), "validade", descrever(propriedades.validadeDaVerificacao())));
    }

    CaixaDeSaida.Mensagem cadastroRepetido(Usuario usuario) {
        return modelos.montar(usuario.getEmail(), "cadastro-repetido", "Tentativa de cadastro com seu e-mail",
                "Tentativa de cadastro", "Acessar o portal", base() + CAMINHO_DO_LOGIN,
                Map.of("nome", usuario.getNome(), "linkRedefinicao", base() + CAMINHO_DA_RECUPERACAO));
    }

    CaixaDeSaida.Mensagem redefinicao(Usuario usuario, String token) {
        return modelos.montar(usuario.getEmail(), "redefinicao", "Redefinição de senha", "Redefinição de senha",
                "Criar nova senha", propriedades.linkPara(CAMINHO_DA_REDEFINICAO, token),
                Map.of("nome", usuario.getNome(), "validade", descrever(propriedades.validadeDaRedefinicao())));
    }

    CaixaDeSaida.Mensagem senhaAlterada(Usuario usuario) {
        return modelos.montar(usuario.getEmail(), "senha-alterada", "Sua senha foi alterada", "Senha alterada",
                "Redefinir senha", base() + CAMINHO_DA_RECUPERACAO, Map.of("nome", usuario.getNome()));
    }

    CaixaDeSaida.Mensagem convite(Usuario usuario, String token, String convidante) {
        List<String> perfis = usuario.getPerfis().stream().map(Perfil::getDescricao).sorted().toList();
        return modelos.montar(usuario.getEmail(), "convite", "Convite de acesso à ViaFlux Mobilidade", "Convite de acesso",
                "Aceitar convite", propriedades.linkPara(CAMINHO_DO_CONVITE, token), Map.of(
                        "nome", usuario.getNome(),
                        "convidante", convidante,
                        "email", usuario.getEmail(),
                        "rotuloDosPerfis", perfis.size() == 1 ? "Perfil" : "Perfis",
                        "perfis", String.join(", ", perfis),
                        "validade", descrever(propriedades.validadeDoConvite())
                ));
    }

    private String base() {
        String url = propriedades.portalUrl();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    static String descrever(Duration validade) {
        long dias = validade.toDays();
        if (dias >= 2 && validade.toHoursPart() == 0 && validade.toMinutesPart() == 0) {
            return dias + " dias";
        }
        long horas = validade.toHours();
        if (horas >= 1 && validade.toMinutesPart() == 0) {
            return horas + (horas == 1 ? " hora" : " horas");
        }
        long minutos = validade.toMinutes();
        return minutos + (minutos == 1 ? " minuto" : " minutos");
    }
}
