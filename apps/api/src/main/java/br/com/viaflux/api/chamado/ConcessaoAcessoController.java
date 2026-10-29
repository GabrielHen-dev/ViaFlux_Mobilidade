package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/admin/chamados")
class ConcessaoAcessoController {
    record Request(@NotBlank @Size(max = 1000) String justificativa) { }
    private final ChamadoRepository chamados;
    private final ConcessaoAcessoChamadoRepository concessoes;
    private final IdentificacaoDoUsuario identificacao;
    private final Clock clock;

    ConcessaoAcessoController(ChamadoRepository chamados, ConcessaoAcessoChamadoRepository concessoes,
                              IdentificacaoDoUsuario identificacao, Clock clock) {
        this.chamados = chamados; this.concessoes = concessoes; this.identificacao = identificacao; this.clock = clock;
    }

    @PostMapping("/{codigo}/concessao-acesso")
    ConcessaoResponse conceder(@PathVariable String codigo, @Valid @RequestBody Request request, @AuthenticationPrincipal Jwt token) {
        UsuarioAtual usuario = identificacao.de(token);
        if (!usuario.perfis().contains("ADMIN")) throw ErroDeChamado.proibido("Apenas ADMIN pode conceder acesso excepcional.");
        Chamado chamado = chamados.findByCodigo(codigo).filter(item -> !item.naLixeira()).orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
        OffsetDateTime agora = OffsetDateTime.now(clock).withOffsetSameInstant(ZoneOffset.UTC);
        concessoes.save(new ConcessaoAcessoChamado(chamado, usuario.id(), request.justificativa().trim(), agora));
        return new ConcessaoResponse("Acesso temporário registrado por 15 minutos.", agora.plusMinutes(15));
    }

    record ConcessaoResponse(String mensagem, OffsetDateTime expiraEm) { }
}
