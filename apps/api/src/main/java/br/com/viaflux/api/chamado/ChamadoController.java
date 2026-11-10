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
@Tag(name = "Chamados", description = "Abertura, consulta e atendimento de chamados")
public class ChamadoController {

    private final IdentificacaoDoUsuario identificacao;
    private final AberturaDeChamadoService abertura;
    private final ConsultaDeChamadosService consulta;
    private final AtendimentoService atendimento;
    private final ResponsavelPeloAtendimentoService responsavel;

    ChamadoController(
            IdentificacaoDoUsuario identificacao,
            AberturaDeChamadoService abertura,
            ConsultaDeChamadosService consulta,
            AtendimentoService atendimento,
            ResponsavelPeloAtendimentoService responsavel
    ) {
        this.identificacao = identificacao;
        this.abertura = abertura;
        this.consulta = consulta;
        this.atendimento = atendimento;
        this.responsavel = responsavel;
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
            description = "Clientes veem os próprios chamados; departamentos, os da sua fila; ADMIN e ATENDENTE têm visão global; "
                    + "LIDER_OPERACIONAL acompanha todos os chamados sem alterar. "
                    + "A fila normal exclui chamados sem classificação; etapa=TRIAGEM lista a fila de exceções aguardando classificação. "
                    + "ordenacao=ativos_recentes inclui todo o histórico, com chamados ativos primeiro e depois os mais recentemente atualizados.",
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
            @Parameter(description = "fila, recentes ou ativos_recentes") @RequestParam(required = false) String ordenacao,
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

    @PatchMapping("/{codigo}/status")
    @Operation(
            summary = "Alterar status de um chamado já triado",
            description = "Status aceitos: Na fila, Em atendimento, Aguardando, Resolvido e Fechado. Aberto e Em triagem não podem ser "
                    + "definidos à mão, e antes da triagem a resposta é 409. Aguardando exige motivoAguardando (CLIENTE pausa o SLA "
                    + "de resolução); Resolvido exige resumoResolucao; Fechado só depois de Resolvido; Na fila libera o responsável "
                    + "pelo atendimento. O cliente é notificado. Perfis: ADMIN, ATENDENTE e DEPARTAMENTO (só a própria fila).",
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
                    + "Perfis: ADMIN, ATENDENTE e DEPARTAMENTO (só a própria fila).",
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

    @GetMapping("/{codigo}/responsaveis-possiveis")
    @Operation(
            summary = "Listar pessoas do setor que podem assumir o chamado",
            description = "Usuários ativos com perfil DEPARTAMENTO no departamento responsável pelo chamado. Antes da triagem a resposta "
                    + "é 409. Perfis: ADMIN, ATENDENTE e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    List<Autor> pessoasDoSetor(@PathVariable String codigo, @AuthenticationPrincipal Jwt token) {
        return responsavel.pessoasDoSetor(codigo, identificacao.de(token));
    }

    @PostMapping("/{codigo}/responsavel")
    @Operation(
            summary = "Transferir o chamado para outra pessoa do setor",
            description = "Troca o responsável pelo atendimento por outra pessoa ativa do mesmo departamento, sem mudar a fila. Na fila "
                    + "passa para Em atendimento; os demais status são mantidos. A pessoa recebe uma notificação. Chamados resolvidos, "
                    + "fechados ou cancelados respondem 409. Perfis: ADMIN, ATENDENTE e DEPARTAMENTO (só a própria fila).",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    ChamadoResponse transferirResponsavel(@PathVariable String codigo, @Valid @RequestBody TransferenciaDeResponsavelRequest request,
                                          @AuthenticationPrincipal Jwt token) {
        return responsavel.transferir(codigo, request, identificacao.de(token));
    }

    @PostMapping("/{codigo}/atualizacoes")
    @Operation(
            summary = "Enviar mensagem ou nota interna no chat do chamado",
            description = "visivelCliente=true envia uma mensagem ao solicitante, que conta como 1ª resposta e gera notificação; false "
                    + "registra uma nota interna, sem aviso. Cliente e gestor de frota enviam mensagens sempre visíveis, que avisam a equipe "
                    + "e tiram o chamado de Aguardando quando ele aguardava o cliente. Arquivos vão por POST /api/chamados/{codigo}/mensagens/arquivo. "
                    + "Chamado fechado não aceita mensagens (409). Limite de 30 mensagens por minuto por usuário (429). Perfis: ADMIN, "
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
