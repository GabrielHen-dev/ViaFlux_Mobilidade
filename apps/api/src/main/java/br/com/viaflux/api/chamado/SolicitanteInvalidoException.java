package br.com.viaflux.api.chamado;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

import java.util.Map;

public class SolicitanteInvalidoException extends ErrorResponseException {

    public SolicitanteInvalidoException(String mensagem) {
        super(HttpStatus.BAD_REQUEST, corpo(mensagem), null);
    }

    private static ProblemDetail corpo(String mensagem) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Um ou mais campos são inválidos.");
        problema.setProperty("errors", Map.of("solicitanteId", mensagem));
        return problema;
    }
}
