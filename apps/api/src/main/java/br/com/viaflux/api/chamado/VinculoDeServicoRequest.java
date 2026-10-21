package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record VinculoDeServicoRequest(
        @NotNull(message = "Selecione um fornecedor credenciado.")
        UUID fornecedorId,

        @NotBlank(message = "Informe o tipo de serviço.")
        @Size(max = 120, message = "O tipo de serviço deve ter no máximo 120 caracteres.")
        String tipoServico,

        @Size(max = 255, message = "O local deve ter no máximo 255 caracteres.")
        String local,

        @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.")
        String observacao
) {
}
