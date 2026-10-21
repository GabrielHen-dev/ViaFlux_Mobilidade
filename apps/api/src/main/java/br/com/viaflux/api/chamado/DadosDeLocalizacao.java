package br.com.viaflux.api.chamado;

import jakarta.validation.constraints.Size;

public record DadosDeLocalizacao(
        @Size(max = 255, message = "A localização deve ter no máximo 255 caracteres.")
        String endereco,
        Double latitude,
        Double longitude,
        @Size(max = 9, message = "O CEP deve ter no máximo 9 caracteres.")
        String cep,
        @Size(max = 200, message = "A rua deve ter no máximo 200 caracteres.")
        String logradouro,
        @Size(max = 20, message = "O número deve ter no máximo 20 caracteres.")
        String numero,
        @Size(max = 200, message = "O complemento deve ter no máximo 200 caracteres.")
        String complemento,
        @Size(max = 120, message = "O bairro deve ter no máximo 120 caracteres.")
        String bairro,
        @Size(max = 120, message = "A cidade deve ter no máximo 120 caracteres.")
        String cidade,
        @Size(max = 2, message = "Use a sigla da UF com 2 letras.")
        String uf
) {

    public static DadosDeLocalizacao apenasEndereco(String endereco) {
        return new DadosDeLocalizacao(endereco, null, null, "", "", "", "", "", "", "");
    }

    boolean temCoordenadas() {
        return latitude != null && longitude != null;
    }

    boolean vazia() {
        return texto(endereco).isEmpty() && texto(logradouro).isEmpty() && texto(cidade).isEmpty()
                && texto(cep).isEmpty() && !temCoordenadas();
    }

    static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
