package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.admin;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.lider;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AcessoAosChamadosTests {

    private final ChamadoRepository chamados = mock(ChamadoRepository.class);
    private final AcessoAosChamados acesso = new AcessoAosChamados(chamados);

    @Test
    void centralComVisaoGlobalVeChamadosAindaSemTriagem() {
        Chamado aguardandoTriagem = cadastrado(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        assertThat(acesso.visivel("VF-0001", atendente())).isSameAs(aguardandoTriagem);
        assertThat(acesso.visivel("VF-0001", lider())).isSameAs(aguardandoTriagem);
    }

    @Test
    void departamentoNaoEnxergaChamadoAntesDaTriagem() {
        cadastrado(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        assertThatThrownBy(() -> acesso.visivel("VF-0001", departamento(TipoChamado.MANUTENCAO)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void departamentoEnxergaChamadoTriadoDaPropriaFila() {
        Chamado daManutencao = cadastrado(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));

        assertThat(acesso.visivel("VF-0001", departamento(TipoChamado.MANUTENCAO))).isSameAs(daManutencao);
        assertThat(acesso.paraConduzir("VF-0001", departamento(TipoChamado.TI, TipoChamado.MANUTENCAO))).isSameAs(daManutencao);
    }

    @Test
    void departamentoNaoEnxergaChamadoDeOutroDepartamento() {
        cadastrado(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));

        assertThatThrownBy(() -> acesso.visivel("VF-0001", departamento(TipoChamado.TI)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThatThrownBy(() -> acesso.paraConduzir("VF-0001", departamento(TipoChamado.TI)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void vinculoComDepartamentoSemOPerfilDepartamentoNaoDaAcesso() {
        cadastrado(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));
        UsuarioAtual semPerfil = new UsuarioAtual(UUID.randomUUID(), "Sem perfil", Set.of("FORNECEDOR"), Set.of("MANUTENCAO"), null);

        assertThatThrownBy(() -> acesso.visivel("VF-0001", semPerfil)).isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void clienteEnxergaSoOsPropriosChamadosMasNaoAtua() {
        UUID anaId = UUID.randomUUID();
        cadastrado(chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(anaId, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3));

        assertThat(acesso.visivel("VF-0001", cliente(anaId)).getCodigo()).isEqualTo("VF-0001");
        assertThatThrownBy(() -> acesso.visivel("VF-0001", cliente(UUID.randomUUID())))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThat(erroAo(() -> acesso.paraConduzir("VF-0001", cliente(anaId))).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void chamadoNaLixeiraNaoEhVisivelNemParaACentral() {
        Chamado excluido = cadastrado(chamadoAberto("VF-0001", QUARTA_AS_DEZ));
        excluido.moverParaLixeira(QUARTA_AS_DEZ.plusMinutes(1));

        assertThatThrownBy(() -> acesso.visivel("VF-0001", atendente())).isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThat(acesso.naLixeira("VF-0001")).isSameAs(excluido);
    }

    @Test
    void chamadoForaDaLixeiraNaoPodeSerRestaurado() {
        cadastrado(chamadoAberto("VF-0001", QUARTA_AS_DEZ));

        assertThatThrownBy(() -> acesso.naLixeira("VF-0001")).isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void codigoInexistenteNaoEhEncontrado() {
        given(chamados.findByCodigo("VF-9999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> acesso.visivel("VF-9999", atendente()))
                .isInstanceOf(ChamadoNaoEncontradoException.class)
                .hasMessage("Chamado não encontrado: VF-9999");
    }

    @Test
    void filaDoDepartamentoTemSoOsTriadosDoProprioDepartamento() {
        Chamado semTriagem = chamadoAberto("VF-0001", QUARTA_AS_DEZ);
        Chamado daManutencao = chamadoTriado("VF-0002", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        Chamado daTi = chamadoTriado("VF-0003", QUARTA_AS_DEZ, TipoChamado.TI, 3, 3);
        given(chamados.buscarAtivos(null)).willReturn(List.of(semTriagem, daManutencao, daTi));

        assertThat(acesso.visiveis(departamento(TipoChamado.MANUTENCAO), null)).containsExactly(daManutencao);
        assertThat(acesso.visiveis(atendente(), " ")).containsExactly(semTriagem, daManutencao, daTi);
    }

    @Test
    void buscaEhNormalizadaParaAConsulta() {
        given(chamados.buscarAtivos("%volvo fh%")).willReturn(List.of());

        assertThat(acesso.visiveis(atendente(), "  Volvo FH ")).isEmpty();
    }

    @Test
    void conduzQuemEhDaCentralOuDaFilaDoChamado() {
        Chamado daManutencao = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);
        Chamado semTriagem = chamadoAberto("VF-0002", QUARTA_AS_DEZ);

        assertThat(acesso.podeConduzir(daManutencao, admin())).isTrue();
        assertThat(acesso.podeConduzir(daManutencao, atendente())).isTrue();
        assertThat(acesso.podeConduzir(daManutencao, departamento(TipoChamado.MANUTENCAO))).isTrue();
        assertThat(acesso.podeConduzir(daManutencao, departamento(TipoChamado.LOGISTICA))).isFalse();
        assertThat(acesso.podeConduzir(semTriagem, departamento(TipoChamado.MANUTENCAO))).isFalse();
        assertThat(acesso.podeConduzir(daManutencao, lider())).isFalse();
    }

    @Test
    void atendeSoODepartamentoDaFilaOuOAdmin() {
        Chamado daManutencao = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3);

        assertThat(acesso.podeAtender(daManutencao, admin())).isTrue();
        assertThat(acesso.podeAtender(daManutencao, departamento(TipoChamado.MANUTENCAO))).isTrue();
        assertThat(acesso.podeAtender(daManutencao, departamento(TipoChamado.TI))).isFalse();
        assertThat(acesso.podeAtender(daManutencao, atendente())).isFalse();
        assertThat(acesso.podeAtender(daManutencao, lider())).isFalse();
    }

    @Test
    void liderSoAcompanha() {
        cadastrado(chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.MANUTENCAO, 3, 3));

        assertThat(acesso.visivel("VF-0001", lider()).getCodigo()).isEqualTo("VF-0001");
        assertThat(erroAo(() -> acesso.paraConduzir("VF-0001", lider())).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(erroAo(() -> acesso.paraAtender("VF-0001", lider())).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    private Chamado cadastrado(Chamado chamado) {
        given(chamados.findByCodigo(chamado.getCodigo())).willReturn(Optional.of(chamado));
        return chamado;
    }
}
