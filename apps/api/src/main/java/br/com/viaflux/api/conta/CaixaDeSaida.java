package br.com.viaflux.api.conta;

interface CaixaDeSaida {

    record Mensagem(String para, String assunto, String texto) {
    }

    void enviar(Mensagem mensagem);
}
