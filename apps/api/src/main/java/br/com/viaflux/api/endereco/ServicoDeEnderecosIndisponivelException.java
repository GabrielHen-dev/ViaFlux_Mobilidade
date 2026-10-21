package br.com.viaflux.api.endereco;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

class ServicoDeEnderecosIndisponivelException extends ErrorResponseException {

    static final String MENSAGEM =
            "O serviço de endereços está indisponível no momento. Preencha o endereço manualmente.";

    ServicoDeEnderecosIndisponivelException(Throwable causa) {
        super(HttpStatus.SERVICE_UNAVAILABLE,
                ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, MENSAGEM),
                causa);
    }
}
