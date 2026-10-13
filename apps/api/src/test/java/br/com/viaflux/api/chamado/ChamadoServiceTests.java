package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ChamadoServiceTests {

    @Mock
    private ChamadoRepository chamadoRepository;

    @InjectMocks
    private ChamadoService chamadoService;

    @Test
    void createsTicketWithPublicCodeAndFrontendFields() {
        given(chamadoRepository.proximoNumero()).willReturn(1025L);
        given(chamadoRepository.save(any(Chamado.class)))
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
        assertThat(salvo.getCodigo()).isEqualTo("VF-1025");
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
        assertThat(response.id()).isEqualTo("VF-1025");
        assertThat(response.status()).isEqualTo("Aberto");
    }

    @Test
    void usesEmptyStringsForOptionalFieldsNotSentByTheForm() {
        given(chamadoRepository.proximoNumero()).willReturn(1025L);
        given(chamadoRepository.save(any(Chamado.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        ChamadoResponse response = chamadoService.abrir(new AbrirChamadoRequest(
                "Maria Silva", null, "Volvo FH 460", null, "Mecânico", null, null
        ));

        assertThat(response.telefone()).isEmpty();
        assertThat(response.placa()).isEmpty();
        assertThat(response.descricao()).isEmpty();
        assertThat(response.localizacao()).isEmpty();
    }
}
