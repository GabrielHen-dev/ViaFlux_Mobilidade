package br.com.viaflux.api.shared.email;

public interface CaixaDeSaida {

    record Mensagem(String para, String assunto, String texto, String html) {
    }

    void enviar(Mensagem mensagem);
}
