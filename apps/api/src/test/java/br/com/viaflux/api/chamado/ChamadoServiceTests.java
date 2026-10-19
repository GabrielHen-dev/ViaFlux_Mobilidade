package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class ChamadoServiceTests {

    @Mock
    private ChamadoRepository chamadoRepository;

    @Mock
    private ChamadoEventoRepository chamadoEventoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private ChamadoService chamadoService;

    @Test
    void createsTicketWithPublicCodeAndFrontendFields() {
        given(chamadoRepository.proximoNumero()).willReturn(0L);
        given(chamadoRepository.save(any(Chamado.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(chamadoEventoRepository.save(any(ChamadoEvento.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        AbrirChamadoRequest request = new AbrirChamadoRequest(
                "  Maria Silva  ", " (11) 99999-0000 ", " Volvo FH 460 ", "abc-1d23",
                " Mecânico ", " Motor não liga ", " BR-116, km 312 "
        );

        ChamadoResponse response = chamadoService.abrir(request, null);

        ArgumentCaptor<Chamado> chamadoCaptor = ArgumentCaptor.forClass(Chamado.class);
        verify(chamadoRepository).save(chamadoCaptor.capture());
        Chamado salvo = chamadoCaptor.getValue();

        assertThat(salvo.getId()).isNotNull();
        assertThat(salvo.getCodigo()).isEqualTo("VF-0000");
        assertThat(salvo.getCliente()).isEqualTo("Maria Silva");
        assertThat(salvo.getTelefone()).isEqualTo("(11) 99999-0000");
        assertThat(salvo.getModelo()).isEqualTo("Volvo FH 460");
        assertThat(salvo.getPlaca()).isEqualTo("ABC-1D23");
        assertThat(salvo.getTipo()).isEqualTo("Mecânico");
        assertThat(salvo.getPrioridade()).isEqualTo("Média");
        assertThat(salvo.getDescricao()).isEqualTo("Motor não liga");
        assertThat(salvo.getLocalizacao()).isEqualTo("BR-116, km 312");
        assertThat(salvo.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(salvo.getAbertoEm()).isNotNull();
        assertThat(response.id()).isEqualTo("VF-0000");
        assertThat(response.status()).isEqualTo("Aberto");
        assertThat(response.timeline()).hasSize(1);
        assertThat(response.timeline().getFirst().acao()).isEqualTo("Chamado aberto");
        assertThat(response.timeline().getFirst().detalhe()).isEqualTo("Chamado registrado pelo portal ViaFlux.");
        assertThat(response.timeline().getFirst().icon()).isEqualTo("aberto");
        OffsetDateTime aberturaEmSaoPaulo = salvo.getAbertoEm()
                .atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo"))
                .toOffsetDateTime();
        assertThat(response.abertura()).isEqualTo(aberturaEmSaoPaulo);
        assertThat(response.timeline().getFirst().ocorridoEm()).isEqualTo(aberturaEmSaoPaulo);
    }

    @Test
    void usesEmptyStringsForOptionalFieldsNotSentByTheForm() {
        given(chamadoRepository.proximoNumero()).willReturn(0L);
        given(chamadoRepository.save(any(Chamado.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(chamadoEventoRepository.save(any(ChamadoEvento.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        ChamadoResponse response = chamadoService.abrir(new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", null, "Mecânico", null, null
        ), null);

        assertThat(response.telefone()).isEmpty();
        assertThat(response.placa()).isEmpty();
        assertThat(response.descricao()).isEmpty();
        assertThat(response.localizacao()).isEmpty();
    }

    @Test
    void linksAuthenticatedRequesterToCreatedTicket() {
        UUID solicitanteId = UUID.randomUUID();
        Usuario solicitante = mock(Usuario.class);
        given(usuarioRepository.findById(solicitanteId)).willReturn(Optional.of(solicitante));
        given(chamadoRepository.proximoNumero()).willReturn(1L);
        given(chamadoRepository.save(any(Chamado.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(chamadoEventoRepository.save(any(ChamadoEvento.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        chamadoService.abrir(new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", null, "Mecânico", null, null
        ), solicitanteId);

        ArgumentCaptor<Chamado> chamadoCaptor = ArgumentCaptor.forClass(Chamado.class);
        verify(chamadoRepository).save(chamadoCaptor.capture());
        assertThat(chamadoCaptor.getValue().getSolicitante()).isSameAs(solicitante);
        verify(usuarioRepository).findById(solicitanteId);
    }

    @Test
    void rejectsRequesterWithoutClientProfileWhenCentralOpensTicket() {
        UUID atendenteId = UUID.randomUUID();
        UUID naoClienteId = UUID.randomUUID();
        Usuario naoCliente = mock(Usuario.class);
        given(naoCliente.isAtivo()).willReturn(true);
        given(naoCliente.getPerfis()).willReturn(java.util.Set.of());
        given(usuarioRepository.findById(naoClienteId)).willReturn(Optional.of(naoCliente));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> chamadoService.abrirEmNomeDoCliente(new AbrirChamadoRequest(
                        "Maria Silva", null, "Volvo FH 460", null, "Mecânico", null, null
                ), naoClienteId, atendenteId))
                .isInstanceOf(SolicitanteInvalidoException.class);
    }

    @Test
    void returnsTheTimelineWhenConsultingATicket() {
        OffsetDateTime ocorridoEm = OffsetDateTime.of(2026, 10, 13, 12, 0, 0, 0, ZoneOffset.UTC);
        Chamado chamado = new Chamado("VF-0000", new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", null, "Mecânico", null, null
        ), ocorridoEm);
        ChamadoEvento abertura = new ChamadoEvento(
                chamado, "Chamado aberto", "Chamado registrado pelo portal ViaFlux.", "aberto", ocorridoEm
        );
        UUID solicitanteId = UUID.randomUUID();
        given(chamadoRepository.findByCodigoAndSolicitante_Id("VF-0000", solicitanteId))
                .willReturn(Optional.of(chamado));
        given(chamadoEventoRepository.findByChamadoCodigoOrderByOcorridoEmAscIdAsc("VF-0000"))
                .willReturn(List.of(abertura));

        ChamadoResponse response = chamadoService.consultar("VF-0000", solicitanteId, false);

        assertThat(response.timeline()).hasSize(1);
        assertThat(response.timeline().getFirst().hora()).isEqualTo("09:00");
        assertThat(response.timeline().getFirst().ocorridoEm())
                .isEqualTo(ocorridoEm.atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo")).toOffsetDateTime());
    }

    @Test
    void doesNotRevealTicketOwnedByAnotherCustomer() {
        UUID solicitanteId = UUID.randomUUID();
        given(chamadoRepository.findByCodigoAndSolicitante_Id("VF-0001", solicitanteId))
                .willReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                        chamadoService.consultar("VF-0001", solicitanteId, false))
                .isInstanceOf(ChamadoNaoEncontradoException.class)
                .hasMessage("Chamado não encontrado: VF-0001");
    }

    @Test
    void listsTicketsUsingNormalizedFiltersAndNewestFirstOrdering() {
        UUID solicitanteId = UUID.randomUUID();
        OffsetDateTime abertura = OffsetDateTime.of(2026, 10, 13, 12, 0, 0, 0, ZoneOffset.UTC);
        Chamado chamado = new Chamado("VF-0000", new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", "ABC-1D23", "Mecânico", null, "BR-116"
        ), abertura);
        given(chamadoRepository.buscar(any(), any(), any(), any(), anyBoolean(), any()))
                .willReturn(new PageImpl<>(List.of(chamado), PageRequest.of(1, 5), 6));

        ChamadosPageResponse response = chamadoService.listar(
                " Volvo ", " aBeRtO ", "mÉdIa", 1, 5, solicitanteId, false
        );

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().id()).isEqualTo("VF-0000");
        assertThat(response.content().getFirst().status()).isEqualTo("Aberto");
        assertThat(response.page()).isEqualTo(1);
        assertThat(response.size()).isEqualTo(5);
        assertThat(response.totalElements()).isEqualTo(6);
        assertThat(response.totalPages()).isEqualTo(2);

        verify(chamadoRepository).buscar(
                org.mockito.ArgumentMatchers.eq("%volvo%"),
                org.mockito.ArgumentMatchers.eq(StatusChamado.ABERTO),
                org.mockito.ArgumentMatchers.eq("Média"),
                org.mockito.ArgumentMatchers.eq(solicitanteId),
                org.mockito.ArgumentMatchers.eq(false),
                org.mockito.ArgumentMatchers.argThat(pageable ->
                        pageable.getPageNumber() == 1
                                && pageable.getPageSize() == 5
                                && pageable.getSort().equals(Sort.by(
                                Sort.Order.desc("abertoEm"), Sort.Order.desc("codigo")
                        )))
        );
        verifyNoMoreInteractions(chamadoRepository);
    }

    @Test
    void rejectsUnsupportedPriorityFilter() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                        chamadoService.listar(null, null, "Urgente", 0, 20, UUID.randomUUID(), false))
                .isInstanceOf(FiltroChamadoInvalidoException.class)
                .hasMessage("A prioridade informada não é válida.");
    }

    @Test
    void acceptsFechadoAsStatusFilter() {
        given(chamadoRepository.buscar(any(), any(), any(), any(), anyBoolean(), any()))
                .willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        chamadoService.listar(null, "Fechado", null, 0, 20, UUID.randomUUID(), false);

        verify(chamadoRepository).buscar(
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(StatusChamado.FECHADO),
                org.mockito.ArgumentMatchers.isNull(),
                any(),
                org.mockito.ArgumentMatchers.eq(false),
                any()
        );
    }

    @Test
    void summarizesDashboardCounters() {
        given(chamadoRepository.count()).willReturn(12L);
        given(chamadoRepository.countByPrioridade("Crítica")).willReturn(2L);
        given(chamadoRepository.countByStatus(StatusChamado.EM_ATENDIMENTO)).willReturn(5L);
        given(chamadoRepository.countByStatus(StatusChamado.AGUARDANDO)).willReturn(3L);

        ChamadosResumoResponse resumo = chamadoService.resumir();

        assertThat(resumo).isEqualTo(new ChamadosResumoResponse(12, 2, 5, 3));
        verify(chamadoRepository).count();
        verify(chamadoRepository).countByPrioridade("Crítica");
        verify(chamadoRepository).countByStatus(StatusChamado.EM_ATENDIMENTO);
        verify(chamadoRepository).countByStatus(StatusChamado.AGUARDANDO);
        verifyNoMoreInteractions(chamadoRepository);
    }
}
