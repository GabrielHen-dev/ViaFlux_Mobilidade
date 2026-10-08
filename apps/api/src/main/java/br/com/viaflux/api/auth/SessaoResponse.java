package br.com.viaflux.api.auth;

import br.com.viaflux.api.usuario.UsuarioResponse;

public record SessaoResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UsuarioResponse usuario
) {

    static SessaoResponse de(TokenService.TokensEmitidos tokens, UsuarioResponse usuario) {
        return new SessaoResponse(
                tokens.accessToken(),
                tokens.refreshToken(),
                "Bearer",
                tokens.validadeDoAccessToken().toSeconds(),
                usuario
        );
    }
}
