package br.com.viaflux.api.chamado;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

import java.util.Map;

class ErroDeChamado extends ErrorResponseException {

    private ErroDeChamado(HttpStatus status, String detalhe, Map<String, String> erros) {
        super(status, problema(status, detalhe, erros), null);
    }

    private static ProblemDetail problema(HttpStatus status, String detalhe, Map<String, String> erros) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, detalhe);
        if (erros != null && !erros.isEmpty()) {
            problema.setProperty("errors", erros);
        }
        return problema;
    }

    static ErroDeChamado conflito(String detalhe) {
        return new ErroDeChamado(HttpStatus.CONFLICT, detalhe, null);
    }

    static ErroDeChamado invalido(String detalhe) {
        return new ErroDeChamado(HttpStatus.BAD_REQUEST, detalhe, null);
    }

    static ErroDeChamado camposInvalidos(Map<String, String> erros) {
        return new ErroDeChamado(HttpStatus.BAD_REQUEST, "Um ou mais campos são inválidos.", erros);
    }

    static ErroDeChamado campoInvalido(String campo, String mensagem) {
        return camposInvalidos(Map.of(campo, mensagem));
    }

    static ErroDeChamado naoEncontrado(String detalhe) {
        return new ErroDeChamado(HttpStatus.NOT_FOUND, detalhe, null);
    }

    static ErroDeChamado proibido(String detalhe) {
        return new ErroDeChamado(HttpStatus.FORBIDDEN, detalhe, null);
    }

    static ErroDeChamado arquivoGrandeDemais(String detalhe) {
        return new ErroDeChamado(HttpStatus.PAYLOAD_TOO_LARGE, detalhe, null);
    }

    static ErroDeChamado formatoNaoSuportado(String detalhe) {
        return new ErroDeChamado(HttpStatus.UNSUPPORTED_MEDIA_TYPE, detalhe, null);
    }
}
