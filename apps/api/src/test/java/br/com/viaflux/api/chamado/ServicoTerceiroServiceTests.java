package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Organizacao;
import br.com.viaflux.api.usuario.OrganizacaoRepository;
import br.com.viaflux.api.usuario.TipoOrganizacao;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.autor;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.fornecedor;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.organizacao;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class ServicoTerceiroServiceTests {

    private static final UUID ANA = UUID.randomUUID();

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(30));
    private final OrganizacaoRepository organizacoes = mock(OrganizacaoRepository.class);
    private final ServicoTerceiroService servico = new ServicoTerceiroService(ambiente.servicos, organizacoes, ambiente.acesso,
            ambiente.historico, ambiente.aviso, ambiente.montagem, ambiente.relogio);
    private final Organizacao guincho = organizacao("Guincho Rápido", TipoOrganizacao.FORNECEDOR);
    private final UsuarioAtual paula = atendente();
    private Chamado chamado;

    @BeforeEach
    void preparar() {
        chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(ANA, "Ana Cliente", "CLIENTE"), TipoChamado.ASSISTENCIA_24H, 5);
        chamado.concluirTriagem(TipoChamado.ASSISTENCIA_24H, 5, 5, TipoChamado.ASSISTENCIA_24H, new Autor(UUID.randomUUID(), "Rui"),
                QUARTA_AS_DEZ.plusMinutes(5));
        ambiente.cadastrar(chamado);
        given(organizacoes.findById(guincho.getId())).willReturn(Optional.of(guincho));
    }

    @Test
    void listaOsFornecedoresCredenciadosComEspecialidadePadrao() {
        given(organizacoes.findByTipoAndAtivoTrueOrderByNomeAsc(TipoOrganizacao.FORNECEDOR)).willReturn(List.of(guincho));

        assertThat(servico.fornecedores()).containsExactly(new FornecedorResponse(guincho.getId(), "Guincho Rápido", "Fornecedor credenciado"));
    }

    @Test
    void acionaOFornecedorParaUmChamadoTriado() {
        servico.vincular("VF-0001", new VinculoDeServicoRequest(guincho.getId(), " Reboque ", " BR-116 ", null), paula);

        ArgumentCaptor<ServicoTerceiro> salvo = ArgumentCaptor.forClass(ServicoTerceiro.class);
        then(ambiente.servicos).should().save(salvo.capture());
        assertThat(salvo.getValue().getFornecedor()).isSameAs(guincho);
        assertThat(salvo.getValue().getTipoServico()).isEqualTo("Reboque");
        assertThat(salvo.getValue().getLocal()).isEqualTo("BR-116");
        assertThat(salvo.getValue().getObservacao()).isEmpty();
        assertThat(salvo.getValue().getStatus()).isEqualTo(StatusServico.SOLICITADO);
        assertThat(salvo.getValue().getHistorico()).singleElement()
                .satisfies(registro -> assertThat(registro.getAutor()).isEqualTo(autor(paula)));
        ChamadoEvento evento = ambiente.unicoEventoDoTipo(TipoEvento.FORNECEDOR);
        assertThat(evento.getDetalhe()).isEqualTo("Guincho Rápido · Reboque");
        assertThat(evento.isVisivelCliente()).isFalse();
    }

    @Test
    void naoAcionaFornecedorAntesDaTriagem() {
        ambiente.cadastrar(chamadoAberto("VF-0002", QUARTA_AS_DEZ));

        ErroDeChamado erro = erroAo(() -> servico.vincular("VF-0002", new VinculoDeServicoRequest(guincho.getId(), "Reboque", null, null), paula));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        then(ambiente.servicos).should(never()).save(any());
    }

    @Test
    void recusaOrganizacaoQueNaoEhFornecedoraAtiva() {
        Organizacao cliente = organizacao("Transportadora", TipoOrganizacao.CLIENTE);
        Organizacao inativo = organizacao("Guincho Antigo", TipoOrganizacao.FORNECEDOR);
        ReflectionTestUtils.setField(inativo, "ativo", false);
        given(organizacoes.findById(cliente.getId())).willReturn(Optional.of(cliente));
        given(organizacoes.findById(inativo.getId())).willReturn(Optional.of(inativo));

        assertThat(errosDeCampo(erroAo(() -> servico.vincular("VF-0001", new VinculoDeServicoRequest(cliente.getId(), "Reboque", null, null), paula))))
                .containsKey("fornecedorId");
        assertThat(errosDeCampo(erroAo(() -> servico.vincular("VF-0001", new VinculoDeServicoRequest(inativo.getId(), "Reboque", null, null), paula))))
                .containsKey("fornecedorId");
    }

    @Test
    void naoAcionaUmSegundoServicoEnquantoOPrimeiroEstaEmAndamento() {
        ServicoTerceiro emAndamento = servicoDoGuincho();
        given(ambiente.servicos.findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(chamado.getId())).willReturn(List.of(emAndamento));

        ErroDeChamado erro = erroAo(() -> servico.vincular("VF-0001", new VinculoDeServicoRequest(guincho.getId(), "Reboque", null, null), paula));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void aceitaNovoServicoDepoisQueOAnteriorFoiConcluido() {
        ServicoTerceiro concluido = servicoDoGuincho();
        concluido.atualizar(StatusServico.CONCLUIDO, "", new Autor(null, "Guincho"), QUARTA_AS_DEZ.plusMinutes(20));
        given(ambiente.servicos.findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(chamado.getId())).willReturn(List.of(concluido));

        servico.vincular("VF-0001", new VinculoDeServicoRequest(guincho.getId(), "Chaveiro", null, null), paula);

        then(ambiente.servicos).should().save(any(ServicoTerceiro.class));
    }

    @Test
    void departamentoDeOutraFilaNaoAcionaFornecedor() {
        assertThatThrownBy(() -> servico.vincular("VF-0001",
                new VinculoDeServicoRequest(guincho.getId(), "Reboque", null, null), departamento(TipoChamado.TI)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void cancelaOServicoDoChamado() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));

        servico.cancelar("VF-0001", existente.getId(), paula);

        assertThat(existente.isCancelado()).isTrue();
        assertThat(existente.emAndamento()).isFalse();
        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.FORNECEDOR).getAcao()).isEqualTo("Serviço terceirizado cancelado");
    }

    @Test
    void naoCancelaServicoDeOutroChamadoNemJaCancelado() {
        Chamado outro = ambiente.cadastrar(chamadoAberto("VF-0002", QUARTA_AS_DEZ));
        ServicoTerceiro deOutroChamado = new ServicoTerceiro(outro, guincho, "Reboque", "", "", new Autor(null, "Paula"), QUARTA_AS_DEZ);
        ServicoTerceiro cancelado = servicoDoGuincho();
        cancelado.cancelar(QUARTA_AS_DEZ.plusMinutes(10));
        given(ambiente.servicos.findById(deOutroChamado.getId())).willReturn(Optional.of(deOutroChamado));
        given(ambiente.servicos.findById(cancelado.getId())).willReturn(Optional.of(cancelado));

        assertThat(erroAo(() -> servico.cancelar("VF-0001", deOutroChamado.getId(), paula)).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(erroAo(() -> servico.cancelar("VF-0001", cancelado.getId(), paula)).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void fornecedorAtualizaOProprioServicoEOClienteEhAvisado() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));
        UsuarioAtual gil = fornecedor(guincho.getId());

        ServicoDoFornecedorResponse resposta = servico.atualizarPeloFornecedor(existente.getId(),
                new AtualizacaoDeServicoRequest("em_execucao", " Equipe a caminho "), gil);

        assertThat(resposta.status()).isEqualTo(StatusServico.EM_EXECUCAO);
        assertThat(resposta.chamadoId()).isEqualTo("VF-0001");
        assertThat(resposta.historico()).extracting(AtualizacaoServicoResponse::status)
                .containsExactly(StatusServico.SOLICITADO, StatusServico.EM_EXECUCAO);
        assertThat(resposta.historico().getLast().autor().nome()).isEqualTo("Gil Guincho · Guincho Rápido");
        assertThat(resposta.historico().getLast().observacao()).isEqualTo("Equipe a caminho");
        ChamadoEvento evento = ambiente.unicoEventoDoTipo(TipoEvento.FORNECEDOR);
        assertThat(evento.getAcao()).isEqualTo("Fornecedor: Em execução");
        assertThat(evento.getDetalhe()).isEqualTo("Guincho Rápido · Equipe a caminho");
        assertThat(ambiente.notificacoes).singleElement().satisfies(notificacao -> {
            assertThat(notificacao.destinatarioId()).isEqualTo(ANA);
            assertThat(notificacao.novoStatus()).isEqualTo("Serviço terceirizado em execução");
        });
    }

    @Test
    void fornecedorNaoAtualizaServicoDeOutroFornecedor() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));

        ErroDeChamado erro = erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(),
                new AtualizacaoDeServicoRequest("RECEBIDO", null), fornecedor(UUID.randomUUID())));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(existente.getStatus()).isEqualTo(StatusServico.SOLICITADO);
    }

    @Test
    void fornecedorNaoVoltaParaSolicitadoNemUsaStatusDesconhecido() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));
        UsuarioAtual gil = fornecedor(guincho.getId());

        assertThat(errosDeCampo(erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("SOLICITADO", null), gil))))
                .containsKey("status");
        assertThat(errosDeCampo(erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("PAUSADO", null), gil))))
                .containsKey("status");
    }

    @Test
    void fornecedorSoAvancaOStatusDoServico() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));
        UsuarioAtual gil = fornecedor(guincho.getId());
        servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("EM_EXECUCAO", null), gil);

        ErroDeChamado voltar = erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("RECEBIDO", null), gil));
        ErroDeChamado repetir = erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("EM_EXECUCAO", null), gil));

        assertThat(voltar.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(repetir.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(existente.getStatus()).isEqualTo(StatusServico.EM_EXECUCAO);
    }

    @Test
    void servicoConcluidoNaoMudaMais() {
        ServicoTerceiro existente = servicoDoGuincho();
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));
        UsuarioAtual gil = fornecedor(guincho.getId());
        servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("CONCLUIDO", null), gil);

        ErroDeChamado erro = erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(), new AtualizacaoDeServicoRequest("RECEBIDO", null), gil));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(existente.getStatus()).isEqualTo(StatusServico.CONCLUIDO);
        assertThat(existente.getHistorico()).hasSize(2);
    }

    @Test
    void fornecedorNaoAtualizaServicoDeChamadoNaLixeira() {
        ServicoTerceiro existente = servicoDoGuincho();
        chamado.moverParaLixeira(QUARTA_AS_DEZ.plusMinutes(15));
        given(ambiente.servicos.findById(existente.getId())).willReturn(Optional.of(existente));

        ErroDeChamado erro = erroAo(() -> servico.atualizarPeloFornecedor(existente.getId(),
                new AtualizacaoDeServicoRequest("RECEBIDO", null), fornecedor(guincho.getId())));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(existente.getStatus()).isEqualTo(StatusServico.SOLICITADO);
    }

    @Test
    void fornecedorSemOrganizacaoNaoTemServicos() {
        assertThat(servico.doFornecedor(fornecedor(null))).isEmpty();
    }

    @Test
    void fornecedorNaoVeServicosDeChamadosNaLixeira() {
        ServicoTerceiro ativo = servicoDoGuincho();
        Chamado excluido = chamadoAberto("VF-0002", QUARTA_AS_DEZ);
        excluido.moverParaLixeira(QUARTA_AS_DEZ.plusMinutes(1));
        ServicoTerceiro daLixeira = new ServicoTerceiro(excluido, guincho, "Reboque", "", "", new Autor(null, "Paula"), QUARTA_AS_DEZ);
        given(ambiente.servicos.findByFornecedorIdAndCanceladoFalseOrderByAtualizadoEmDesc(guincho.getId())).willReturn(List.of(ativo, daLixeira));

        assertThat(servico.doFornecedor(fornecedor(guincho.getId()))).extracting(ServicoDoFornecedorResponse::chamadoId).containsExactly("VF-0001");
    }

    private ServicoTerceiro servicoDoGuincho() {
        return new ServicoTerceiro(chamado, guincho, "Reboque", "BR-116", "", autor(paula), QUARTA_AS_DEZ.plusMinutes(10));
    }
}
