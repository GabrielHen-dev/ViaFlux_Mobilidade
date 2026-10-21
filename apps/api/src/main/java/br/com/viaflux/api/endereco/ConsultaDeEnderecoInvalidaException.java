package br.com.viaflux.api.endereco;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

class ConsultaDeEnderecoInvalidaException extends ErrorResponseException {

    ConsultaDeEnderecoInvalidaException(String mensagem) {
        super(HttpStatus.BAD_REQUEST, ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, mensagem), null);
    }
}
