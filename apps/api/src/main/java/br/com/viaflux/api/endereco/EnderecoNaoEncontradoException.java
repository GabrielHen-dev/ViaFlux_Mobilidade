package br.com.viaflux.api.endereco;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

class EnderecoNaoEncontradoException extends ErrorResponseException {

    EnderecoNaoEncontradoException(String mensagem) {
        super(HttpStatus.NOT_FOUND, ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, mensagem), null);
    }
}
