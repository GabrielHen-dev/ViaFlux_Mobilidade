package br.com.viaflux.api.chamado;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AbrirChamadoRequest(
        UUID solicitanteId,

        @NotBlank(message = "Selecione o motivo da solicitação.")
        String motivoId,

        @NotBlank(message = "Selecione o contexto situacional.")
        String contextoId,

        @NotBlank(message = "Descreva o problema.")
        @Size(max = 5000, message = "A descrição deve ter no máximo 5000 caracteres.")
        String descricao,

        @NotBlank(message = "Informe o nome do solicitante.")
        @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
        String cliente,

        @Size(max = 30, message = "O telefone deve ter no máximo 30 caracteres.")
        String telefone,

        @Size(max = 120, message = "O modelo deve ter no máximo 120 caracteres.")
        String modelo,

        @Size(max = 20, message = "A placa deve ter no máximo 20 caracteres.")
        String placa,

        @Valid
        DadosDeLocalizacao localizacao
) {
}
