package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeSla;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class EscalonamentoServiceTests {

    private static final OffsetDateTime TRINTA_MINUTOS_DEPOIS = QUARTA_AS_DEZ.plusMinutes(30);

    private final LiderancaRepository lideranca = mock(LiderancaRepository.class);
    private final List<UUID> notificados = new ArrayList<>();
    private final UsuarioAtual paula = atendente();
    private final Usuario lia = usuario(UUID.randomUUID(), "Lia Líder", "LIDER_OPERACIONAL");

    @Test
    void chamadoComSlaVencidoEhEscalonadoEAvisaALideranca() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(TRINTA_MINUTOS_DEPOIS);
        Chamado chamado = ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5));
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA)).willReturn(List.of(lia));

        ChamadoResponse resposta = servico(ambiente).escalonar("VF-0001", new EscalonamentoRequest("Cliente parado há 30 minutos"), paula);

        assertThat(resposta.escalonamento()).isNotNull();
        assertThat(resposta.escalonamento().por().nome()).isEqualTo("Paula Atendente");
        assertThat(resposta.escalonamento().observacao()).isEqualTo("Cliente parado há 30 minutos");
        assertThat(chamado.getEscalonadoEm()).isEqualTo(TRINTA_MINUTOS_DEPOIS.withOffsetSameInstant(java.time.ZoneOffset.UTC));
        assertThat(notificados).containsExactly(lia.getId());
        ChamadoEvento evento = ambiente.unicoEventoDoTipo(TipoEvento.ESCALONAMENTO);
        assertThat(evento.isVisivelCliente()).isFalse();
        assertThat(evento.getDetalhe()).contains("1 responsável notificado");
    }

    @Test
    void semLiderAtivoOsAdministradoresSaoAvisados() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(TRINTA_MINUTOS_DEPOIS);
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5));
        Usuario adao = usuario(UUID.randomUUID(), "Adão Admin", "ADMIN");
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA)).willReturn(List.of());
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DE_CONTINGENCIA)).willReturn(List.of(adao));

        servico(ambiente).escalonar("VF-0001", null, departamento(TipoChamado.MANUTENCAO));

        assertThat(notificados).containsExactly(adao.getId());
    }

    @Test
    void chamadoDentroDoPrazoNaoPodeSerEscalonado() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(6));
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5));

        ErroDeChamado erro = erroAo(() -> servico(ambiente).escalonar("VF-0001", null, paula));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(notificados).isEmpty();
    }

    @Test
    void oMesmoEpisodioSoEhEscalonadoUmaVez() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(TRINTA_MINUTOS_DEPOIS);
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5));
        given(lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA)).willReturn(List.of(lia));
        servico(ambiente).escalonar("VF-0001", null, paula);

        ErroDeChamado erro = erroAo(() -> servico(ambiente).escalonar("VF-0001", null, paula));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(notificados).hasSize(1);
    }

    @Test
    void departamentoDeOutraFilaNaoEscalona() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(TRINTA_MINUTOS_DEPOIS);
        ambiente.cadastrar(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 5, 5));

        assertThatThrownBy(() -> servico(ambiente).escalonar("VF-0001", null, departamento(TipoChamado.FINANCEIRO)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThat(notificados).isEmpty();
    }

    private EscalonamentoService servico(AmbienteDeChamados ambiente) {
        CanalDeNotificacao canal = (destinatario, chamadoId, codigo, status, mensagem, instante) -> notificados.add(destinatario);
        return new EscalonamentoService(ambiente.acesso, politicaDeSla(), lideranca, canal, ambiente.historico, ambiente.montagem,
                ambiente.relogio);
    }
}
