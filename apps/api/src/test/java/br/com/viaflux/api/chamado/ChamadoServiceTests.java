package br.com.viaflux.api.chamado;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class ChamadoServiceTests {

    @Mock
    private ChamadoRepository chamadoRepository;

    @Mock
    private ChamadoEventoRepository chamadoEventoRepository;

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

        ChamadoResponse response = chamadoService.abrir(request);

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
        assertThat(response.timeline().getFirst().ocorridoEm()).isEqualTo(salvo.getAbertoEm());
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
        ));

        assertThat(response.telefone()).isEmpty();
        assertThat(response.placa()).isEmpty();
        assertThat(response.descricao()).isEmpty();
        assertThat(response.localizacao()).isEmpty();
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
        given(chamadoRepository.findByCodigo("VF-0000")).willReturn(Optional.of(chamado));
        given(chamadoEventoRepository.findByChamadoCodigoOrderByOcorridoEmAscIdAsc("VF-0000"))
                .willReturn(List.of(abertura));

        ChamadoResponse response = chamadoService.consultar("VF-0000");

        assertThat(response.timeline()).hasSize(1);
        assertThat(response.timeline().getFirst().hora()).isEqualTo("09:00");
        assertThat(response.timeline().getFirst().ocorridoEm()).isEqualTo(ocorridoEm);
    }

    @Test
    void listsTicketsUsingNormalizedFiltersAndNewestFirstOrdering() {
        OffsetDateTime abertura = OffsetDateTime.of(2026, 10, 13, 12, 0, 0, 0, ZoneOffset.UTC);
        Chamado chamado = new Chamado("VF-0000", new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", "ABC-1D23", "Mecânico", null, "BR-116"
        ), abertura);
        given(chamadoRepository.buscar(any(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(chamado), PageRequest.of(1, 5), 6));

        ChamadosPageResponse response = chamadoService.listar(" Volvo ", " aBeRtO ", "mÉdIa", 1, 5);

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
                        chamadoService.listar(null, null, "Urgente", 0, 20))
                .isInstanceOf(FiltroChamadoInvalidoException.class)
                .hasMessage("A prioridade informada não é válida.");
    }
}
