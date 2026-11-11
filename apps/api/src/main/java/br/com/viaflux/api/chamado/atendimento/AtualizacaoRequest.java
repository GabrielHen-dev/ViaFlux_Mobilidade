package br.com.viaflux.api.chamado.atendimento;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizacaoRequest(
        @NotBlank(message = "Escreva a atualização.")
        @Size(max = 5000, message = "A atualização deve ter no máximo 5000 caracteres.")
        String texto,

        boolean visivelCliente,

        String destino
) {

    static final String DESTINO_SOLICITANTE = "SOLICITANTE";
    static final String DESTINO_INTERNO = "INTERNO";
    static final String DESTINO_FORNECEDOR = "FORNECEDOR";

    public AtualizacaoRequest(String texto, boolean visivelCliente) {
        this(texto, visivelCliente, null);
    }
}
