package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AbrirChamadoRequest(
        @NotBlank(message = "O nome do cliente é obrigatório.")
        @Size(max = 150, message = "O nome do cliente deve ter no máximo 150 caracteres.")
        String cliente,

        @Size(max = 30, message = "O telefone deve ter no máximo 30 caracteres.")
        String telefone,

        @NotBlank(message = "O modelo do veículo é obrigatório.")
        @Size(max = 120, message = "O modelo deve ter no máximo 120 caracteres.")
        String modelo,

        @Size(max = 20, message = "A placa deve ter no máximo 20 caracteres.")
        String placa,

        @NotBlank(message = "O tipo do problema é obrigatório.")
        @Size(max = 80, message = "O tipo do problema deve ter no máximo 80 caracteres.")
        String tipo,

        String descricao,

        @Size(max = 255, message = "A localização deve ter no máximo 255 caracteres.")
        String localizacao
) {
}
