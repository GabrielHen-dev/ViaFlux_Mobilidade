package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.contexto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.motivo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeTriagem;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class AberturaDeChamadoServiceTests {

    private static final UUID ANA = UUID.randomUUID();

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ);
    private final MotivoRepository motivos = mock(MotivoRepository.class);
    private final ContextoRepository contextos = mock(ContextoRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final AberturaDeChamadoService servico = new AberturaDeChamadoService(ambiente.chamados, motivos, contextos, usuarios,
            politicaDeTriagem(), ambiente.historico, ambiente.montagem, ambiente.relogio);
    private final Usuario anaCadastrada = usuario(ANA, "Ana Cliente", "CLIENTE");

    @BeforeEach
    void preparar() {
        given(motivos.findById("M-FREIO")).willReturn(Optional.of(motivo(TipoChamado.MANUTENCAO, 5)));
        given(contextos.findById("C-PARADO")).willReturn(Optional.of(contexto(TipoChamado.MANUTENCAO, 5)));
        given(contextos.findById("C-PATIO")).willReturn(Optional.of(contexto(TipoChamado.MANUTENCAO, 1)));
        given(contextos.findById("C-SISTEMA")).willReturn(Optional.of(contexto(TipoChamado.TI, 3)));
        given(ambiente.chamados.proximoNumero()).willReturn(7L);
        given(ambiente.chamados.save(any(Chamado.class))).willAnswer(invocacao -> invocacao.getArgument(0));
        given(usuarios.getReferenceById(ANA)).willReturn(anaCadastrada);
    }

    @Test
    void clienteAbreChamadoQueEntraNaFilaDeTriagemSemPrioridade() {
        AberturaDeChamadoService.Resultado resultado = servico.abrir(pedido(null, "C-PARADO"), cliente(ANA), null);

        Chamado salvo = chamadoSalvo();
        assertThat(resultado.criado()).isTrue();
        assertThat(salvo.getCodigo()).isEqualTo("VF-0007");
        assertThat(salvo.getSolicitante()).isSameAs(anaCadastrada);
        assertThat(salvo.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(salvo.getAbertoEm()).isEqualTo(QUARTA_AS_DEZ);
        assertThat(salvo.getTriagemPrazoMinutos()).isEqualTo(10);
        assertThat(salvo.getTriagemLimite()).isEqualTo(QUARTA_AS_DEZ.plusMinutes(10));
        assertThat(salvo.getModelo()).isEqualTo("Volvo FH 460");

        ChamadoResponse resposta = resultado.chamado();
        assertThat(resposta.id()).isEqualTo("VF-0007");
        assertThat(resposta.status()).isEqualTo("Aberto");
        assertThat(resposta.prioridade()).isNull();
        assertThat(resposta.score()).isNull();
        assertThat(resposta.classificacao()).isNull();
        assertThat(resposta.departamento()).isNull();
        assertThat(resposta.sla()).isNull();
        assertThat(resposta.triagem().prazoMinutos()).isEqualTo(10);
        assertThat(resposta.override()).isNull();
        assertThat(resposta.servico()).isNull();
        assertThat(resposta.timeline()).extracting(EventoResponse::acao).containsExactly("Chamado aberto", "Aguardando triagem");
        assertThat(resposta.timeline()).extracting(EventoResponse::detalhe).containsExactly(
                "Chamado registrado pelo portal ViaFlux.", "Um atendente vai analisar a solicitação em até 10 minutos.");
    }

    @Test
    void urgenciaBaixaDaMaisTempoParaATriagem() {
        servico.abrir(pedido(null, "C-PATIO"), cliente(ANA), null);

        assertThat(chamadoSalvo().getTriagemPrazoMinutos()).isEqualTo(40);
    }

    @Test
    void chamadoSemVeiculoRegistraQueOModeloNaoSeAplica() {
        AbrirChamadoRequest semVeiculo = new AbrirChamadoRequest(null, "M-FREIO", "C-PARADO", "Motor não liga", "Ana Cliente",
                null, "  ", null, null);

        servico.abrir(semVeiculo, cliente(ANA), null);

        assertThat(chamadoSalvo().getModelo()).isEqualTo("Não se aplica");
    }

    @Test
    void reenvioComAMesmaChaveDeIdempotenciaDevolveOChamadoJaAberto() {
        Chamado existente = chamadoAberto("VF-0003", QUARTA_AS_DEZ, anaCadastrada, TipoChamado.MANUTENCAO, 5);
        given(ambiente.chamados.findByChaveIdempotencia(ANA + ":chave-1")).willReturn(Optional.of(existente));

        AberturaDeChamadoService.Resultado resultado = servico.abrir(pedido(null, "C-PARADO"), cliente(ANA), " chave-1 ");

        assertThat(resultado.criado()).isFalse();
        assertThat(resultado.chamado().id()).isEqualTo("VF-0003");
        then(ambiente.chamados).should(never()).save(any());
    }

    @Test
    void chaveDeIdempotenciaFicaAssociadaAoUsuario() {
        servico.abrir(pedido(null, "C-PARADO"), cliente(ANA), "chave-1");

        assertThat(ReflectionTestUtils.getField(chamadoSalvo(), "chaveIdempotencia")).isEqualTo(ANA + ":chave-1");
    }

    @Test
    void recusaMotivoDesconhecidoEContextoDeOutroTipo() {
        ErroDeChamado semMotivo = erroAo(() -> servico.abrir(
                new AbrirChamadoRequest(null, "M-INEXISTENTE", "C-INEXISTENTE", "Motor", "Ana", null, null, null, null), cliente(ANA), null));
        ErroDeChamado contextoDeOutroTipo = erroAo(() -> servico.abrir(pedido(null, "C-SISTEMA"), cliente(ANA), null));

        assertThat(semMotivo.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errosDeCampo(semMotivo)).containsOnlyKeys("motivoId", "contextoId");
        assertThat(errosDeCampo(contextoDeOutroTipo)).containsEntry("contextoId", "O contexto não corresponde ao tipo do motivo.");
        then(ambiente.chamados).should(never()).save(any());
    }

    @Test
    void centralPrecisaInformarOClienteSolicitante() {
        assertThatThrownBy(() -> servico.abrir(pedido(null, "C-PARADO"), atendente(), null))
                .isInstanceOf(SolicitanteInvalidoException.class);
        then(ambiente.chamados).should(never()).save(any());
    }

    @Test
    void centralSoAbreEmNomeDeClienteAtivo() {
        UUID atendenteId = UUID.randomUUID();
        UUID inativoId = UUID.randomUUID();
        Usuario naoCliente = usuario(atendenteId, "Rui Atendente", "ATENDENTE");
        Usuario inativo = usuario(inativoId, "Cliente inativo", "CLIENTE");
        ReflectionTestUtils.setField(inativo, "ativo", false);
        given(usuarios.findById(atendenteId)).willReturn(Optional.of(naoCliente));
        given(usuarios.findById(inativoId)).willReturn(Optional.of(inativo));

        assertThatThrownBy(() -> servico.abrir(pedido(atendenteId, "C-PARADO"), atendente(), null))
                .isInstanceOf(SolicitanteInvalidoException.class);
        assertThatThrownBy(() -> servico.abrir(pedido(inativoId, "C-PARADO"), atendente(), null))
                .isInstanceOf(SolicitanteInvalidoException.class);
    }

    @Test
    void centralAbreEmNomeDoClienteEscolhido() {
        given(usuarios.findById(ANA)).willReturn(Optional.of(anaCadastrada));
        UsuarioAtual paula = atendente();

        AberturaDeChamadoService.Resultado resultado = servico.abrir(pedido(ANA, "C-PARADO"), paula, null);

        assertThat(chamadoSalvo().getSolicitante()).isSameAs(anaCadastrada);
        assertThat(resultado.chamado().timeline().getFirst().detalhe())
                .isEqualTo("Chamado registrado pela Central ViaFlux por Paula Atendente.");
        assertThat(resultado.chamado().timeline().getFirst().autor()).isEqualTo(new Autor(paula.id(), "Paula Atendente"));
    }

    @Test
    void atendenteQueTambemEhClienteAbreParaSiMesmoSemInformarSolicitante() {
        UsuarioAtual atendenteECliente = new UsuarioAtual(ANA, "Ana", Set.of("ATENDENTE", "CLIENTE"), Set.of(), null);

        AberturaDeChamadoService.Resultado resultado = servico.abrir(pedido(null, "C-PARADO"), atendenteECliente, null);

        assertThat(chamadoSalvo().getSolicitante()).isSameAs(anaCadastrada);
        assertThat(resultado.chamado().timeline().getFirst().detalhe()).isEqualTo("Chamado registrado pelo portal ViaFlux.");
    }

    private static AbrirChamadoRequest pedido(UUID solicitanteId, String contextoId) {
        return new AbrirChamadoRequest(solicitanteId, "M-FREIO", contextoId, "Freio falhando", "Ana Cliente",
                "(11) 99999-0000", " Volvo FH 460 ", "abc-1d23", DadosDeLocalizacao.apenasEndereco("BR-116, km 312"));
    }

    private Chamado chamadoSalvo() {
        ArgumentCaptor<Chamado> salvo = ArgumentCaptor.forClass(Chamado.class);
        then(ambiente.chamados).should().save(salvo.capture());
        return salvo.getValue();
    }
}
