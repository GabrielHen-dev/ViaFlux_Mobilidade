package br.com.viaflux.api.chamado;

public class ChamadoNaoEncontradoException extends RuntimeException {

    public ChamadoNaoEncontradoException(String codigo) {
        super("Chamado não encontrado: " + codigo);
    }
}
