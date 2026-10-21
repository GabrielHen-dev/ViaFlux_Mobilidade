package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizacaoDeServicoRequest(
        @NotBlank(message = "Use Recebido, Em execução ou Concluído.")
        String status,

        @Size(max = 2000, message = "A observação deve ter no máximo 2000 caracteres.")
        String observacao
) {
}
