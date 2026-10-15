package br.com.viaflux.api.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CriarOrganizacaoRequest(
        @NotBlank(message = "O nome da organização é obrigatório.")
        @Size(max = 160, message = "O nome deve ter no máximo 160 caracteres.")
        String nome,
        @NotNull(message = "O tipo da organização é obrigatório.")
        TipoOrganizacao tipo
) {
}
