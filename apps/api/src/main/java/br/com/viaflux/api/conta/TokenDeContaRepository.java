package br.com.viaflux.api.conta;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface TokenDeContaRepository extends JpaRepository<TokenDeConta, UUID> {

    Optional<TokenDeConta> findByHashDoTokenAndFinalidade(String hashDoToken, FinalidadeDoToken finalidade);

    List<TokenDeConta> findByUsuarioIdAndFinalidadeAndUsadoEmIsNull(UUID usuarioId, FinalidadeDoToken finalidade);
}
