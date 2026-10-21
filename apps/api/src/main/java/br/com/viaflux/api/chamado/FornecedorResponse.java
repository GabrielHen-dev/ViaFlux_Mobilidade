package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Organizacao;

import java.util.UUID;

public record FornecedorResponse(UUID id, String nome, String especialidade) {

    private static final String ESPECIALIDADE_PADRAO = "Fornecedor credenciado";

    static FornecedorResponse de(Organizacao organizacao) {
        String especialidade = organizacao.getEspecialidade();
        return new FornecedorResponse(
                organizacao.getId(),
                organizacao.getNome(),
                especialidade == null || especialidade.isBlank() ? ESPECIALIDADE_PADRAO : especialidade
        );
    }
}
