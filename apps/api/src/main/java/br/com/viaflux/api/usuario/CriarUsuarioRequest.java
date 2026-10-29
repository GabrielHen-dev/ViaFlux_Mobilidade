package br.com.viaflux.api.usuario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

public record CriarUsuarioRequest(
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
        String nome,
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        String email,
        @NotEmpty(message = "Informe ao menos um perfil.")
        Set<@NotBlank(message = "O código do perfil não pode ficar vazio.") String> perfis,
        UUID organizacaoId,
        Set<@NotBlank(message = "O código do departamento não pode ficar vazio.") String> departamentos
) {
}
