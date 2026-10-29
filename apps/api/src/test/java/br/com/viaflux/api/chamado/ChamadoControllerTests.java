package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import br.com.viaflux.api.shared.config.SecurityConfig;
import br.com.viaflux.api.shared.error.ApiExceptionHandler;
import br.com.viaflux.api.usuario.IdentificacaoDoUsuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ChamadoController.class, TriagemController.class})
@Import({SecurityConfig.class, ApiExceptionHandler.class})
class ChamadoControllerTests {

    private static final OffsetDateTime ABERTURA = OffsetDateTime.of(2026, 10, 21, 10, 0, 0, 0, ZoneOffset.ofHours(-3));
    private static final String CORPO_DE_ABERTURA = """
            {
              "motivoId":"M-MANUTENCAO-1",
              "contextoId":"C-MANUTENCAO-1",
              "descricao":"Freio falhando",
              "cliente":"Maria Silva",
              "modelo":"Volvo FH 460",
              "placa":"abc-1d23",
              "localizacao":{"endereco":"BR-116, km 312","latitude":-23.5,"longitude":-46.6}
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdentificacaoDoUsuario identificacao;

    @MockitoBean
    private AberturaDeChamadoService abertura;

    @MockitoBean
    private ConsultaDeChamadosService consulta;

    @MockitoBean
    private AtendimentoService atendimento;

    @MockitoBean
    private LixeiraService lixeira;

    @MockitoBean
    private TriagemService triagem;

    @Test
    void exigeAutenticacaoParaAbrirChamado() throws Exception {
        mockMvc.perform(post("/api/chamados").contentType(MediaType.APPLICATION_JSON).content(CORPO_DE_ABERTURA))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void clienteAbreChamadoQueAguardaTriagem() throws Exception {
        UsuarioAtual maria = usuario("CLIENTE");
        given(abertura.abrir(any(AbrirChamadoRequest.class), eq(maria), eq("chave-1")))
                .willReturn(new AberturaDeChamadoService.Resultado(respostaDoChamado("VF-0000"), true));

        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(maria))
                        .header("Idempotency-Key", "chave-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/chamados/VF-0000"))
                .andExpect(jsonPath("$.id").value("VF-0000"))
                .andExpect(jsonPath("$.status").value("Aberto"))
                .andExpect(jsonPath("$.prioridade").isEmpty())
                .andExpect(jsonPath("$.triagem.prazoMinutos").value(10))
                .andExpect(jsonPath("$.triagem.situacao").value("NO_PRAZO"));
    }

    @Test
    void reenvioIdempotenteDevolveOChamadoExistenteComStatusOk() throws Exception {
        UsuarioAtual maria = usuario("CLIENTE");
        given(abertura.abrir(any(AbrirChamadoRequest.class), eq(maria), eq("chave-1")))
                .willReturn(new AberturaDeChamadoService.Resultado(respostaDoChamado("VF-0000"), false));

        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(maria))
                        .header("Idempotency-Key", "chave-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").value("VF-0000"));
    }

    @Test
    void validaOsCamposObrigatoriosDaAbertura() throws Exception {
        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(usuario("CLIENTE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivoId\":\"\",\"contextoId\":\"\",\"descricao\":\"\",\"cliente\":\"\",\"localizacao\":{\"uf\":\"SPX\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.descricao").value("Descreva o problema."))
                .andExpect(jsonPath("$.errors.cliente").value("Informe o nome do solicitante."))
                .andExpect(jsonPath("$.errors['localizacao.uf']").value("Use a sigla da UF com 2 letras."));
        then(abertura).should(never()).abrir(any(), any(), any());
    }

    @Test
    void centralPrecisaInformarOClienteSolicitante() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        given(abertura.abrir(any(AbrirChamadoRequest.class), eq(paula), isNull()))
                .willThrow(new SolicitanteInvalidoException("Informe o cliente solicitante."));

        mockMvc.perform(post("/api/chamados")
                        .with(autenticado(paula))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO_DE_ABERTURA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.solicitanteId").value("Informe o cliente solicitante."));
    }

    @Test
    void somenteClientesEAtendimentoDaCentralAbremChamado() throws Exception {
        for (String perfil : List.of("LIDER_OPERACIONAL", "DEPARTAMENTO", "FORNECEDOR")) {
            mockMvc.perform(post("/api/chamados")
                            .with(autenticado(usuario(perfil)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(CORPO_DE_ABERTURA))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void listaComOsFiltrosInterpretados() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        FiltrosDeChamados esperados = new FiltrosDeChamados("Volvo", StatusChamado.NA_FILA, Prioridade.P1, TipoChamado.MANUTENCAO,
                SituacaoPrazo.EM_RISCO, FiltrosDeChamados.Etapa.ATENDIMENTO, FiltrosDeChamados.Ordenacao.RECENTES);
        given(consulta.listar(esperados, 2, 10, paula)).willReturn(new ChamadosPageResponse(List.of(resumo("VF-0001")), 2, 10, 21, 3));

        mockMvc.perform(get("/api/chamados")
                        .with(autenticado(paula))
                        .queryParam("busca", "Volvo")
                        .queryParam("status", "Na fila")
                        .queryParam("prioridade", "P1")
                        .queryParam("departamento", "MANUTENCAO")
                        .queryParam("sla", "EM_RISCO")
                        .queryParam("etapa", "ATENDIMENTO")
                        .queryParam("ordenacao", "recentes")
                        .queryParam("page", "2")
                        .queryParam("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("VF-0001"))
                .andExpect(jsonPath("$.content[0].departamento.nome").value("Manutenção"))
                .andExpect(jsonPath("$.totalElements").value(21))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void departamentoPodeListarASuaFila() throws Exception {
        UsuarioAtual manutencao = usuario("DEPARTAMENTO");
        given(consulta.listar(any(FiltrosDeChamados.class), eq(0), eq(20), eq(manutencao)))
                .willReturn(new ChamadosPageResponse(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/chamados").with(autenticado(manutencao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void recusaFiltroInvalidoETamanhoDePaginaAcimaDeCem() throws Exception {
        mockMvc.perform(get("/api/chamados").with(autenticado(usuario("CLIENTE"))).queryParam("status", "Inválido"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("O status informado não é válido."));
        mockMvc.perform(get("/api/chamados").with(autenticado(usuario("CLIENTE"))).queryParam("etapa", "FIM"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A etapa informada não é válida."));
        mockMvc.perform(get("/api/chamados").with(autenticado(usuario("CLIENTE"))).queryParam("size", "101"))
                .andExpect(status().isBadRequest());
        then(consulta).should(never()).listar(any(), anyInt(), anyInt(), any());
    }

    @Test
    void resumoEhDaCentralInclusiveDoDepartamento() throws Exception {
        UsuarioAtual manutencao = usuario("DEPARTAMENTO");
        given(consulta.resumir(any(FiltrosDeChamados.class), eq(manutencao))).willReturn(new ResumoDeChamadosResponse(
                3, Map.of(), Map.of(), Map.of(),
                new ResumoDeChamadosResponse.Sla(new ResumoDeChamadosResponse.Contadores(1, 1, 1), new ResumoDeChamadosResponse.Contadores(3, 0, 0)),
                List.of("VF-0001"), new ResumoDeChamadosResponse.Triagem(2, 1, 1, 0, ABERTURA)));

        mockMvc.perform(get("/api/chamados/resumo").with(autenticado(manutencao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.triagem.aguardando").value(2))
                .andExpect(jsonPath("$.p1SemPrimeiraResposta[0]").value("VF-0001"));
        mockMvc.perform(get("/api/chamados/resumo").with(autenticado(usuario("CLIENTE"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void consultaInexistenteResponde404() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        given(consulta.consultar("VF-9999", paula)).willThrow(new ChamadoNaoEncontradoException("VF-9999"));

        mockMvc.perform(get("/api/chamados/VF-9999").with(autenticado(paula)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Chamado não encontrado."));
    }

    @Test
    void alterarStatusAntesDaTriagemRespondeConflito() throws Exception {
        UsuarioAtual paula = usuario("ADMIN");
        given(atendimento.alterarStatus(eq("VF-0001"), any(AlterarStatusRequest.class), eq(paula)))
                .willThrow(ErroDeChamado.conflito("Conclua a triagem do chamado antes desta ação."));

        mockMvc.perform(patch("/api/chamados/VF-0001/status")
                        .with(autenticado(paula))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Em atendimento\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Conclua a triagem do chamado antes desta ação."));
    }

    @Test
    void departamentoAlteraStatusDaPropriaFila() throws Exception {
        UsuarioAtual manutencao = usuario("DEPARTAMENTO");
        given(atendimento.alterarStatus(eq("VF-0001"), any(AlterarStatusRequest.class), eq(manutencao)))
                .willReturn(respostaDoChamado("VF-0001"));

        mockMvc.perform(patch("/api/chamados/VF-0001/status")
                        .with(autenticado(manutencao))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Aguardando\",\"motivoAguardando\":\"CLIENTE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void liderNaoMudaOStatusDoAtendimento() throws Exception {
        UsuarioAtual lia = usuario("LIDER_OPERACIONAL");
        mockMvc.perform(patch("/api/chamados/VF-0001/status")
                        .with(autenticado(lia))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"Resolvido\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/chamados/VF-0001/atendimento").with(autenticado(lia)))
                .andExpect(status().isForbidden());
    }

    @Test
    void liderNaoTransfereNemAcionaFornecedor() throws Exception {
        UsuarioAtual lia = usuario("LIDER_OPERACIONAL");
        mockMvc.perform(post("/api/chamados/VF-0001/transferencias")
                        .with(autenticado(lia))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"departamento\":\"TI\",\"motivo\":\"Motivo suficiente\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/fornecedores").with(autenticado(lia)))
                .andExpect(status().isForbidden());
    }

    @Test
    void departamentoAssumeOAtendimento() throws Exception {
        UsuarioAtual manutencao = usuario("DEPARTAMENTO");
        given(atendimento.assumir("VF-0001", manutencao)).willReturn(respostaDoChamado("VF-0001"));

        mockMvc.perform(post("/api/chamados/VF-0001/atendimento").with(autenticado(manutencao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("VF-0001"));
    }

    @Test
    void clienteEFornecedorNaoAlteramStatusNemTransferem() throws Exception {
        for (String perfil : List.of("CLIENTE", "GESTOR_FROTA", "FORNECEDOR")) {
            mockMvc.perform(patch("/api/chamados/VF-0001/status")
                            .with(autenticado(usuario(perfil)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"Resolvido\"}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/chamados/VF-0001/transferencias")
                            .with(autenticado(usuario(perfil)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"departamento\":\"TI\",\"motivo\":\"Problema no rastreador\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void transferenciaExigeMotivoComDezCaracteres() throws Exception {
        mockMvc.perform(post("/api/chamados/VF-0001/transferencias")
                        .with(autenticado(usuario("ATENDENTE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"departamento\":\"TI\",\"motivo\":\"curto\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.motivo").value("O motivo deve ter entre 10 e 2000 caracteres."));
    }

    @Test
    void clienteRegistraComplementoNoProprioChamado() throws Exception {
        UsuarioAtual maria = usuario("CLIENTE");
        given(atendimento.registrarAtualizacao(eq("VF-0001"), any(AtualizacaoRequest.class), eq(maria)))
                .willReturn(respostaDoChamado("VF-0001"));

        mockMvc.perform(post("/api/chamados/VF-0001/atualizacoes")
                        .with(autenticado(maria))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texto\":\"O veículo está no acostamento\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("VF-0001"));
    }

    @Test
    void lixeiraEhRestritaAAdminEAtendente() throws Exception {
        given(lixeira.listar()).willReturn(List.of());

        mockMvc.perform(delete("/api/chamados/VF-0001").with(autenticado(usuario("DEPARTAMENTO"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/chamados/lixeira").with(autenticado(usuario("DEPARTAMENTO"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/chamados/VF-0001/restauracao").with(autenticado(usuario("CLIENTE"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/chamados/VF-0001").with(autenticado(usuario("ATENDENTE"))))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/chamados/lixeira").with(autenticado(usuario("LIDER_OPERACIONAL"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/chamados/VF-0001").with(autenticado(usuario("LIDER_OPERACIONAL"))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/chamados/lixeira").with(autenticado(usuario("ATENDENTE"))))
                .andExpect(status().isOk());
        mockMvc.perform(delete("/api/chamados/lixeira").with(autenticado(usuario("ADMIN"))))
                .andExpect(status().isNoContent());
        then(lixeira).should().esvaziar();
    }

    @Test
    void atendenteAssumeEConcluiATriagem() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        given(triagem.iniciar("VF-0001", paula)).willReturn(respostaDoChamado("VF-0001"));
        given(triagem.concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 5, 3, null), paula))
                .willReturn(respostaDoChamado("VF-0001"));

        mockMvc.perform(post("/api/chamados/VF-0001/triagem/inicio").with(autenticado(paula)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("VF-0001"));
        mockMvc.perform(post("/api/chamados/VF-0001/triagem")
                        .with(autenticado(paula))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"MANUTENCAO\",\"severidade\":5,\"urgencia\":3}"))
                .andExpect(status().isOk());
        then(triagem).should().concluir("VF-0001", new ConcluirTriagemRequest("MANUTENCAO", 5, 3, null), paula);
    }

    @Test
    void somenteAdminEAtendenteFazemTriagemReclassificacaoEOverride() throws Exception {
        for (String perfil : List.of("DEPARTAMENTO", "LIDER_OPERACIONAL", "CLIENTE")) {
            mockMvc.perform(post("/api/chamados/VF-0001/triagem/inicio").with(autenticado(usuario(perfil))))
                    .andExpect(status().isForbidden());
            mockMvc.perform(post("/api/chamados/VF-0001/triagem")
                            .with(autenticado(usuario(perfil)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"tipo\":\"MANUTENCAO\",\"severidade\":5,\"urgencia\":3}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(put("/api/chamados/VF-0001/override")
                            .with(autenticado(usuario(perfil)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"prioridade\":\"P1\",\"justificativa\":\"Cliente estratégico\"}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(delete("/api/chamados/VF-0001/override").with(autenticado(usuario(perfil))))
                    .andExpect(status().isForbidden());
        }
        then(triagem).shouldHaveNoInteractions();
    }

    @Test
    void validaAConclusaoDaTriagem() throws Exception {
        mockMvc.perform(post("/api/chamados/VF-0001/triagem")
                        .with(autenticado(usuario("ATENDENTE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.tipo").value("Selecione o tipo do chamado."))
                .andExpect(jsonPath("$.errors.severidade").value("Informe a severidade."))
                .andExpect(jsonPath("$.errors.urgencia").value("Informe a urgência."));
    }

    @Test
    void pesosInvalidosNaTriagemVoltamComoErroDeCampo() throws Exception {
        UsuarioAtual paula = usuario("ATENDENTE");
        given(triagem.concluir(eq("VF-0001"), any(ConcluirTriagemRequest.class), eq(paula)))
                .willThrow(ErroDeChamado.campoInvalido("severidade", "Severidade deve ser 1, 3 ou 5."));

        mockMvc.perform(post("/api/chamados/VF-0001/triagem")
                        .with(autenticado(paula))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"MANUTENCAO\",\"severidade\":4,\"urgencia\":3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.severidade").value("Severidade deve ser 1, 3 ou 5."));
    }

    @Test
    void reclassificacaoEOverrideExigemJustificativa() throws Exception {
        mockMvc.perform(put("/api/chamados/VF-0001/classificacao")
                        .with(autenticado(usuario("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"TI\",\"severidade\":3,\"urgencia\":3,\"justificativa\":\"curta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.justificativa").exists());
        mockMvc.perform(put("/api/chamados/VF-0001/override")
                        .with(autenticado(usuario("ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"prioridade\":\"P1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.justificativa").value("O override de prioridade exige justificativa."));
    }

    private UsuarioAtual usuario(String perfil) {
        UsuarioAtual usuario = new UsuarioAtual(UUID.randomUUID(), "Usuário " + perfil, Set.of(perfil),
                "DEPARTAMENTO".equals(perfil) ? Set.of("MANUTENCAO") : Set.of(), null);
        given(identificacao.de(argThat((Jwt token) -> token != null
                && usuario.id().toString().equals(token.getSubject())))).willReturn(usuario);
        return usuario;
    }

    private static RequestPostProcessor autenticado(UsuarioAtual usuario) {
        String perfil = usuario.perfis().iterator().next();
        return jwt()
                .jwt(token -> token.subject(usuario.id().toString()).claim("perfis", List.of(perfil)))
                .authorities(new SimpleGrantedAuthority("ROLE_" + perfil));
    }

    private static ChamadoResumoResponse resumo(String codigo) {
        return new ChamadoResumoResponse(codigo, "Maria Silva", "Volvo FH 460", "ABC-1D23", "BR-116, km 312", "Na fila",
                Prioridade.P1, 10, TipoChamado.MANUTENCAO, DepartamentoResponse.de(TipoChamado.MANUTENCAO), ABERTURA, ABERTURA, null,
                new TriagemResponse(ABERTURA.plusMinutes(10), 10, null, null, ABERTURA.plusMinutes(5), null, SituacaoPrazo.CUMPRIDO), null);
    }

    private static ChamadoResponse respostaDoChamado(String codigo) {
        TriagemResponse triagem = new TriagemResponse(ABERTURA.plusMinutes(10), 10, null, null, null, null, SituacaoPrazo.NO_PRAZO);
        return new ChamadoResponse(codigo, "Maria Silva", "Volvo FH 460", "ABC-1D23", "BR-116, km 312", "Aberto", null, null,
                TipoChamado.MANUTENCAO, null, ABERTURA, ABERTURA, null, triagem, null, "", "Freio falhando",
                new MotivoResponse("M-MANUTENCAO-1", "Falha no sistema de freios", TipoChamado.MANUTENCAO, 5),
                new ContextoResponse("C-MANUTENCAO-1", "Veículo parado", TipoChamado.MANUTENCAO, 5),
                null, null, null, null, List.of(), List.of(), null);
    }
}
