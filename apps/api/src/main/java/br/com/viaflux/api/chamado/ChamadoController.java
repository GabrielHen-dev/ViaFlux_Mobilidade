package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/chamados")
@Tag(name = "Chamados", description = "Abertura, consulta, atendimento e lixeira de chamados")
public class ChamadoController {

    private final IdentificacaoDoUsuario identificacao;
    private final AberturaDeChamadoService abertura;
    private final ConsultaDeChamadosService consulta;
    private final AtendimentoService atendimento;
    private final LixeiraService lixeira;

    ChamadoController(
            IdentificacaoDoUsuario identificacao,
            AberturaDeChamadoService abertura,
            ConsultaDeChamadosService consulta,
            AtendimentoService atendimento,
            LixeiraService lixeira
    ) {
        this.identificacao = identificacao;
        this.abertura = abertura;
        this.consulta = consulta;
        this.atendimento = atendimento;
        this.lixeira = lixeira;
    }

    @PostMapping
    @Operation(
            summary = "Abrir chamado",
            description = "CLIENTE e GESTOR_FROTA abrem em nome próprio; GESTOR_FROTA pode indicar solicitante da própria organização e ATENDENTE abre pela Central. "
                    + "Motivos catalogados recebem classificação e roteamento V1; Outro entra na fila de exceções sem score.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<ChamadoResponse> abrir(
            @Valid @RequestBody AbrirChamadoRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String chaveIdempotencia,
            @AuthenticationPrincipal Jwt token
    ) {
        AberturaDeChamadoService.Resultado resultado = abertura.abrir(request, identificacao.de(token), chaveIdempotencia);
        if (!resultado.criado()) {
            return ResponseEntity.ok(resultado.chamado());
        }
        return ResponseEntity.created(ServletUriComponentsBuilder.fromCurrentRequest()
                        .path("/{id}")
                        .buildAndExpand(resultado.chamado().id())
                        .toUri())
                .body(resultado.chamado());
    }

    @GetMapping
    @Operation(
            summary = "Listar chamados",
            description = "Clientes veem os próprios chamados; departamentos, os da sua fila; ATENDENTE tem visão global; "
                    + "LIDER_OPERACIONAL acompanha os chamados permitidos; ADMIN precisa de concessão excepcional válida por 15 minutos. "
                    + "A fila normal exclui chamados sem classificação; etapa=TRIAGEM lista a fila de exceções aguardando classificação.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadosPageResponse listar(
            @Parameter(description = "Busca por protocolo, cliente, modelo ou placa") @RequestParam(required = false) String busca,
            @Parameter(description = "Rótulo do status, por exemplo: Na fila") @RequestParam(required = false) String status,
            @Parameter(description = "P1, P2, P3 ou P4") @RequestParam(required = false) String prioridade,
            @RequestParam(required = false) String departamento,
            @RequestParam(required = false) String tipo,
            @Parameter(description = "NO_PRAZO, EM_RISCO ou VIOLADO") @RequestParam(required = false) String sla,
            @Parameter(description = "TRIAGEM ou ATENDIMENTO") @RequestParam(required = false) String etapa,
            @Parameter(description = "fila ou recentes") @RequestParam(required = false) String ordenacao,
            @Min(0) @RequestParam(defaultValue = "0") int page,
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt token
    ) {
        FiltrosDeChamados filtros = FiltrosDeChamados.de(busca, status, prioridade, departamento, tipo, sla, etapa, ordenacao);
        return consulta.listar(filtros, page, size, identificacao.de(token));
    }

    @GetMapping("/resumo")
    @Operation(
            summary = "Resumo do painel: status, prioridades, SLA e fila de triagem",
            description = "Contadores por status, prioridade e departamento, situação do SLA, P1 sem 1ª resposta e o bloco da fila de "
                    + "triagem (aguardando, em andamento, em risco, atrasados e próximo limite). Aceita os mesmos filtros da "
                    + "listagem, menos status. Perfis: ADMIN, ATENDENTE, LIDER_OPERACIONAL e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResumoDeChamadosResponse resumir(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) String prioridade,
            @RequestParam(required = false) String departamento,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String sla,
            @RequestParam(required = false) String etapa,
            @AuthenticationPrincipal Jwt token
    ) {
        FiltrosDeChamados filtros = FiltrosDeChamados.de(busca, null, prioridade, departamento, tipo, sla, etapa, null);
        return consulta.resumir(filtros, identificacao.de(token));
    }

    @GetMapping("/lixeira")
    @Operation(
            summary = "Listar chamados na lixeira",
            description = "Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<ChamadoResumoResponse> listarLixeira() {
        return lixeira.listar();
    }

    @DeleteMapping("/lixeira")
    @Operation(
            summary = "Esvaziar a lixeira",
            description = "Exclui definitivamente todos os chamados da lixeira, com histórico e anexos. Não pode ser desfeito. Perfis: "
                    + "ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> esvaziarLixeira() {
        lixeira.esvaziar();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/lixeira/{codigo}")
    @Operation(
            summary = "Excluir definitivamente um chamado da lixeira",
            description = "Só para chamados que já estão na lixeira. Não pode ser desfeito. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> excluirDefinitivamente(@PathVariable String codigo) {
        lixeira.excluirDefinitivamente(codigo);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{codigo}")
    @Operation(
            summary = "Consultar chamado",
            description = "Detalhe completo: timeline, anexos, SLA, triagem, classificação e responsável pelo atendimento. Cliente e "
                    + "gestor de frota veem só os próprios chamados, sem eventos internos, override e serviço terceirizado; "
                    + "departamento vê os chamados triados da própria fila; ADMIN, ATENDENTE e LIDER_OPERACIONAL veem todos. Quem "
                    + "não pode ver recebe 404.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse consultar(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return consulta.consultar(codigo, identificacao.de(token));
    }

    @DeleteMapping("/{codigo}")
    @Operation(
            summary = "Mover chamado para a lixeira",
            description = "Exclusão reversível: o chamado sai das listas e pode ser restaurado. Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<Void> moverParaLixeira(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        lixeira.moverParaLixeira(codigo, identificacao.de(token));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{codigo}/restauracao")
    @Operation(
            summary = "Restaurar chamado da lixeira",
            description = "Perfis: ADMIN e ATENDENTE.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse restaurar(@PathVariable String codigo) {
        return lixeira.restaurar(codigo);
    }

    @PatchMapping("/{codigo}/status")
    @Operation(
            summary = "Alterar status de um chamado já triado",
            description = "Status aceitos: Na fila, Em atendimento, Aguardando, Resolvido e Fechado. Aberto e Em triagem não podem ser "
                    + "definidos à mão, e antes da triagem a resposta é 409. Aguardando exige motivoAguardando (CLIENTE pausa o SLA "
                    + "de resolução); Fechado só depois de Resolvido; Na fila libera o responsável pelo atendimento. O cliente é "
                    + "notificado. Perfis: ADMIN e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse alterarStatus(@PathVariable String codigo, @Valid @RequestBody AlterarStatusRequest request, @AuthenticationPrincipal Jwt token) {
        return atendimento.alterarStatus(codigo, request, identificacao.de(token));
    }

    @PostMapping("/{codigo}/atendimento")
    @Operation(
            summary = "Assumir o atendimento",
            description = "O departamento responsável assume o chamado triado, que vai para Em atendimento com a pessoa registrada como responsável. "
                    + "Outra pessoa da fila pode assumir no lugar. Chamados resolvidos ou fechados não podem ser assumidos (409). "
                    + "Perfis: ADMIN e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse assumir(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return atendimento.assumir(codigo, identificacao.de(token));
    }

    @PostMapping("/{codigo}/transferencias")
    @Operation(
            summary = "Transferir chamado para outro departamento",
            description = "Muda o departamento, devolve o chamado para Na fila (exceto se estiver Resolvido) e libera o responsável. "
                    + "Exige motivo; histórico, anexos e SLA são mantidos. Antes da triagem a resposta é 409. Perfis: ADMIN, "
                    + "ATENDENTE e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse transferir(@PathVariable String codigo, @Valid @RequestBody TransferenciaRequest request, @AuthenticationPrincipal Jwt token) {
        return atendimento.transferir(codigo, request, identificacao.de(token));
    }

    @PostMapping("/{codigo}/atualizacoes")
    @Operation(
            summary = "Registrar mensagem ou anotação no chamado",
            description = "visivelCliente=true registra uma mensagem ao solicitante, que conta como 1ª resposta; false registra uma "
                    + "anotação interna. Cliente e gestor de frota registram complementos, sempre visíveis. Perfis: ADMIN, "
                    + "ATENDENTE, DEPARTAMENTO (só a própria fila), CLIENTE e GESTOR_FROTA (só o próprio chamado). LIDER_OPERACIONAL "
                    + "só acompanha.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ResponseEntity<ChamadoResponse> registrarAtualizacao(
            @PathVariable String codigo,
            @Valid @RequestBody AtualizacaoRequest request,
            @AuthenticationPrincipal Jwt token
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(atendimento.registrarAtualizacao(codigo, request, identificacao.de(token)));
    }

    @PutMapping("/{codigo}/localizacao")
    @Operation(
            summary = "Registrar a localização do chamado",
            description = "Endereço estruturado (CEP, rua, número, bairro, cidade e UF) e/ou coordenadas do GPS. Perfis: ADMIN, "
                    + "ATENDENTE, DEPARTAMENTO (só a própria fila), CLIENTE e GESTOR_FROTA (só o próprio chamado). LIDER_OPERACIONAL "
                    + "só acompanha.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse registrarLocalizacao(
            @PathVariable String codigo,
            @Valid @RequestBody DadosDeLocalizacao request,
            @AuthenticationPrincipal Jwt token
    ) {
        return atendimento.registrarLocalizacao(codigo, request, identificacao.de(token));
    }
}
