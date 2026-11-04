package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.departamento;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.lider;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class ConversaDoChamadoTests {

    private static final UUID ANA = UUID.randomUUID();
    private static final OffsetDateTime AGORA = QUARTA_AS_DEZ.plusMinutes(30);
    private static final Autor BRUNA = new Autor(UUID.randomUUID(), "Bruna Atendente");
    private static final MockMultipartFile FOTO = new MockMultipartFile("arquivo", "pneu.png", "image/png", new byte[]{1, 2, 3});

    private record Aviso(UUID destinatario, String mensagem) {
    }

    private final List<Aviso> avisos = new ArrayList<>();
    private final List<UUID> lidasPor = new ArrayList<>();
    private final List<UUID> emailsDispensados = new ArrayList<>();
    private final CanalDeMensagensDoChat canal = new CanalDeMensagensDoChat() {
        @Override
        public void avisarNovaMensagem(UUID destinatarioId, UUID chamadoId, String codigoDoChamado, String mensagem, OffsetDateTime instante) {
            avisos.add(new Aviso(destinatarioId, mensagem));
        }

        @Override
        public void marcarMensagensComoLidas(UUID destinatarioId, UUID chamadoId, OffsetDateTime ate) {
            lidasPor.add(destinatarioId);
        }

        @Override
        public void dispensarEmailsDaEquipe(UUID chamadoId, UUID solicitanteId) {
            emailsDispensados.add(chamadoId);
        }
    };
    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(AGORA);
    private final LiderancaRepository usuarios = mock(LiderancaRepository.class);
    private final LeituraDaConversaRepository leituras = mock(LeituraDaConversaRepository.class);
    private final AnexoService anexos = mock(AnexoService.class);
    private final AvisosDaConversa avisosDaConversa = new AvisosDaConversa(canal, usuarios, ambiente.aviso, ambiente.historico);
    private final AtendimentoService atendimento = new AtendimentoService(ambiente.acesso, ambiente.historico, ambiente.aviso,
            avisosDaConversa, anexos, ambiente.montagem, ambiente.relogio);
    private final ConversaDoChamadoService conversa = new ConversaDoChamadoService(ambiente.acesso, ambiente.eventos, ambiente.anexos,
            leituras, canal, avisosDaConversa, ambiente.relogio);
    private final UsuarioAtual ana = cliente(ANA);
    private Chamado chamado;

    @BeforeEach
    void preparar() {
        chamado = ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(ANA, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3));
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, BRUNA, QUARTA_AS_DEZ.plusMinutes(5));
        given(ambiente.eventos.findByChamadoIdAndTipoOrderByOcorridoEmAscSequenciaAsc(any(UUID.class), eq(TipoEvento.ATUALIZACAO)))
                .willAnswer(invocacao -> ambiente.eventosDoTipo(TipoEvento.ATUALIZACAO));
        given(leituras.findByChamadoIdAndUsuarioId(any(UUID.class), any(UUID.class))).willReturn(Optional.empty());
    }

    private AtualizacaoRequest publica(String texto) {
        return new AtualizacaoRequest(texto, true);
    }

    private AtualizacaoRequest interna(String texto) {
        return new AtualizacaoRequest(texto, false);
    }

    private ChamadoAnexo anexoGuardado(VisibilidadeDoConteudo visibilidade, Autor autor) {
        return new ChamadoAnexo(chamado, "pneu.png", "image/png", 3, autor, null, QUARTA_AS_DEZ, visibilidade);
    }

    private void anexoSeraGuardado(VisibilidadeDoConteudo visibilidade, UsuarioAtual autor, ChamadoAnexo anexo, boolean criado) {
        given(anexos.enviar("VF-0001", FOTO, "chave", visibilidade, autor)).willReturn(new AnexoService.Resultado(AnexoResponse.de(anexo), criado));
    }

    @Test
    void mensagemDaEquipeAvisaOSolicitanteERegistraAPrimeiraResposta() {
        UsuarioAtual bruna = atendente();

        atendimento.registrarAtualizacao("VF-0001", publica("  Guincho a caminho  "), bruna);

        assertThat(avisos).containsExactly(new Aviso(ANA, bruna.nome() + ": Guincho a caminho"));
        assertThat(ambiente.eventoComAcao("Cliente notificado")).isPresent().get()
                .extracting(ChamadoEvento::isVisivelCliente).isEqualTo(false);
        assertThat(chamado.getPrimeiraRespostaEm()).isEqualTo(AGORA);
    }

    @Test
    void chamadoSemSolicitanteRegistraQueOAvisoNaoFoiEnviado() {
        Chamado semSolicitante = ambiente.cadastrar(chamadoAberto("VF-0002", QUARTA_AS_DEZ));
        semSolicitante.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, BRUNA, QUARTA_AS_DEZ.plusMinutes(5));

        atendimento.registrarAtualizacao("VF-0002", publica("Oi"), atendente());

        assertThat(avisos).isEmpty();
        assertThat(ambiente.eventoComAcao("Notificação não enviada")).isPresent().get()
                .extracting(ChamadoEvento::getDetalhe).isEqualTo("Nova mensagem: chamado sem solicitante vinculado no portal.");
    }

    @Test
    void notaInternaNaoAvisaNinguemNemContaComoPrimeiraResposta() {
        atendimento.registrarAtualizacao("VF-0001", interna("Conferir contrato"), atendente());

        assertThat(avisos).isEmpty();
        assertThat(emailsDispensados).isEmpty();
        assertThat(chamado.getPrimeiraRespostaEm()).isNull();
        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.ATUALIZACAO).isVisivelCliente()).isFalse();
    }

    @Test
    void respostaDoSolicitanteAvisaOResponsavel() {
        chamado.assumirAtendimento(BRUNA, AGORA.minusMinutes(5));

        atendimento.registrarAtualizacao("VF-0001", publica("A placa é ABC-1D23"), ana);

        assertThat(avisos).containsExactly(new Aviso(BRUNA.id(), ana.nome() + ": A placa é ABC-1D23"));
        then(usuarios).should(never()).ativosDoDepartamento(anyString());
    }

    @Test
    void semResponsavelAvisaAFilaDoDepartamento() {
        UUID davi = UUID.randomUUID();
        UUID mara = UUID.randomUUID();
        given(usuarios.ativosDoDepartamento("MANUTENCAO")).willReturn(List.of(
                usuario(davi, "Davi", "DEPARTAMENTO"), usuario(mara, "Mara", "DEPARTAMENTO")));

        atendimento.registrarAtualizacao("VF-0001", publica("Alguma novidade?"), ana);

        assertThat(avisos).extracting(Aviso::destinatario).containsExactly(davi, mara);
        assertThat(ambiente.eventoComAcao("Equipe notificada")).isPresent();
    }

    @Test
    void filaVaziaRecorreAosAtendentes() {
        UUID paula = UUID.randomUUID();
        given(usuarios.ativosDoDepartamento("MANUTENCAO")).willReturn(List.of());
        given(usuarios.ativosComPerfil(Set.of("ATENDENTE"))).willReturn(List.of(usuario(paula, "Paula", "ATENDENTE")));

        atendimento.registrarAtualizacao("VF-0001", publica("Alguma novidade?"), ana);

        assertThat(avisos).extracting(Aviso::destinatario).containsExactly(paula);
    }

    @Test
    void semNinguemParaAvisarORegistroFicaNoHistorico() {
        given(usuarios.ativosDoDepartamento("MANUTENCAO")).willReturn(List.of());
        given(usuarios.ativosComPerfil(any())).willReturn(List.of());

        atendimento.registrarAtualizacao("VF-0001", publica("Alguma novidade?"), ana);

        assertThat(avisos).isEmpty();
        assertThat(ambiente.eventoComAcao("Notificação não enviada")).isPresent();
    }

    @Test
    void respostaDaEquipeSemResponsavelDispensaOEmailDosColegas() {
        atendimento.registrarAtualizacao("VF-0001", publica("Já estamos vendo"), atendente());

        assertThat(emailsDispensados).containsExactly(chamado.getId());
    }

    @Test
    void comResponsavelALeituraDeUmColegaNaoDispensaOEmailDele() {
        chamado.assumirAtendimento(BRUNA, AGORA.minusMinutes(5));

        conversa.marcarComoLida("VF-0001", AGORA.minusMinutes(1), atendente());

        assertThat(emailsDispensados).isEmpty();
    }

    @Test
    void leituraDeQuemConduzDispensaOEmailDaFila() {
        conversa.marcarComoLida("VF-0001", AGORA.minusMinutes(1), departamento(TipoChamado.MANUTENCAO));

        assertThat(emailsDispensados).containsExactly(chamado.getId());
    }

    @Test
    void leituraDoLiderOuDoClienteNaoDispensaOEmailDaFila() {
        conversa.marcarComoLida("VF-0001", AGORA.minusMinutes(1), lider());
        conversa.marcarComoLida("VF-0001", AGORA.minusMinutes(1), ana);

        assertThat(emailsDispensados).isEmpty();
    }

    @Test
    void respostaDoSolicitanteRetomaOAtendimentoQuandoAguardavaOCliente() {
        chamado.assumirAtendimento(BRUNA, AGORA.minusMinutes(10));
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, AGORA.minusMinutes(5));

        atendimento.registrarAtualizacao("VF-0001", publica("Segue a placa"), ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.EM_ATENDIMENTO);
        assertThat(chamado.getMotivoAguardando()).isNull();
        ChamadoEvento mudanca = ambiente.unicoEventoDoTipo(TipoEvento.STATUS);
        assertThat(mudanca.getAcao()).isEqualTo("Status alterado para Em atendimento");
        assertThat(mudanca.getDetalhe()).contains("resposta do solicitante");
        assertThat(mudanca.isVisivelCliente()).isTrue();
        assertThat(ambiente.notificacoes).extracting(AmbienteDeChamados.NotificacaoEnviada::novoStatus).containsExactly("Em atendimento");
    }

    @Test
    void semResponsavelARespostaDevolveOChamadoParaAFila() {
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.CLIENTE, AGORA.minusMinutes(5));

        atendimento.registrarAtualizacao("VF-0001", publica("Segue a placa"), ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.NA_FILA);
    }

    @Test
    void respostaNaoMudaOStatusQuandoAguardaOFornecedor() {
        chamado.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, AGORA.minusMinutes(5));

        atendimento.registrarAtualizacao("VF-0001", publica("Alguma novidade?"), ana);

        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.AGUARDANDO);
        assertThat(chamado.getMotivoAguardando()).isEqualTo(MotivoAguardando.FORNECEDOR);
        assertThat(ambiente.eventosDoTipo(TipoEvento.STATUS)).isEmpty();
    }

    @Test
    void chamadoFechadoNaoRecebeMensagensNemArquivos() {
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, AGORA.minusMinutes(10));
        chamado.alterarStatus(StatusChamado.FECHADO, null, AGORA.minusMinutes(5));

        ErroDeChamado doCliente = erroAo(() -> atendimento.registrarAtualizacao("VF-0001", publica("Oi"), ana));
        ErroDeChamado daEquipe = erroAo(() -> atendimento.registrarAtualizacao("VF-0001", publica("Oi"), atendente()));
        ErroDeChamado arquivo = erroAo(() -> atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "", true, "chave", ana));

        assertThat(doCliente.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(daEquipe.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(arquivo.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ambiente.eventosDoTipo(TipoEvento.ATUALIZACAO)).isEmpty();
        then(anexos).shouldHaveNoInteractions();
    }

    @Test
    void conversaVoltaAFuncionarNaReabertura() {
        chamado.alterarStatus(StatusChamado.RESOLVIDO, null, AGORA.minusMinutes(10));
        chamado.alterarStatus(StatusChamado.FECHADO, null, AGORA.minusMinutes(5));
        chamado.reabrir(AGORA.minusMinutes(1));

        atendimento.registrarAtualizacao("VF-0001", publica("O problema voltou"), ana);

        assertThat(ambiente.eventosDoTipo(TipoEvento.ATUALIZACAO)).hasSize(1);
    }

    @Test
    void liderSoAcompanhaEOutroDepartamentoNaoEnxerga() {
        assertThat(erroAo(() -> atendimento.registrarAtualizacao("VF-0001", publica("Oi"), lider())).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThatThrownBy(() -> atendimento.registrarAtualizacao("VF-0001", publica("Oi"), departamento(TipoChamado.FINANCEIRO)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThatThrownBy(() -> conversa.consultar("VF-0001", departamento(TipoChamado.FINANCEIRO)))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
    }

    @Test
    void limitaAQuantidadeDeMensagensPorMinuto() {
        UsuarioAtual bruna = atendente();
        for (int enviada = 0; enviada < 30; enviada++) {
            atendimento.registrarAtualizacao("VF-0001", interna("Nota " + enviada), bruna);
        }

        assertThatThrownBy(() -> atendimento.registrarAtualizacao("VF-0001", interna("Nota extra"), bruna))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void arquivoDaMensagemAoSolicitanteFicaVisivelAoCliente() {
        UsuarioAtual bruna = atendente();
        ChamadoAnexo anexo = anexoGuardado(VisibilidadeDoConteudo.SOLICITANTE, BRUNA);
        anexoSeraGuardado(VisibilidadeDoConteudo.SOLICITANTE, bruna, anexo, true);

        atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "  Segue a foto  ", true, "chave", bruna);

        ChamadoEvento mensagem = ambiente.unicoEventoDoTipo(TipoEvento.ATUALIZACAO);
        assertThat(mensagem.getDetalhe()).isEqualTo("Segue a foto");
        assertThat(mensagem.getAnexoId()).isEqualTo(anexo.getId());
        assertThat(mensagem.isVisivelCliente()).isTrue();
        assertThat(avisos).hasSize(1);
    }

    @Test
    void arquivoDeNotaInternaFicaInternoESemAviso() {
        UsuarioAtual bruna = atendente();
        anexoSeraGuardado(VisibilidadeDoConteudo.INTERNO, bruna, anexoGuardado(VisibilidadeDoConteudo.INTERNO, BRUNA), true);

        atendimento.enviarArquivoNaConversa("VF-0001", FOTO, null, false, "chave", bruna);

        ChamadoEvento mensagem = ambiente.unicoEventoDoTipo(TipoEvento.ATUALIZACAO);
        assertThat(mensagem.getDetalhe()).isEqualTo("Arquivo enviado: pneu.png");
        assertThat(mensagem.isVisivelCliente()).isFalse();
        assertThat(avisos).isEmpty();
    }

    @Test
    void arquivoDoClienteEhSempreVisivelMesmoPedindoOContrario() {
        anexoSeraGuardado(VisibilidadeDoConteudo.SOLICITANTE, ana, anexoGuardado(VisibilidadeDoConteudo.SOLICITANTE, new Autor(ANA, "Ana")), true);

        atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "", false, "chave", ana);

        assertThat(ambiente.unicoEventoDoTipo(TipoEvento.ATUALIZACAO).isVisivelCliente()).isTrue();
    }

    @Test
    void reenvioDoMesmoArquivoNaoDuplicaAMensagem() {
        anexoSeraGuardado(VisibilidadeDoConteudo.SOLICITANTE, ana, anexoGuardado(VisibilidadeDoConteudo.SOLICITANTE, new Autor(ANA, "Ana")), false);

        atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "", true, "chave", ana);

        assertThat(ambiente.eventosDoTipo(TipoEvento.ATUALIZACAO)).isEmpty();
    }

    @Test
    void textoLongoDemaisEhRecusadoAntesDeGuardarOArquivo() {
        ErroDeChamado erro = erroAo(() -> atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "x".repeat(5001), true, "chave", ana));

        assertThat(errosDeCampo(erro)).containsKey("texto");
        then(anexos).shouldHaveNoInteractions();
    }

    @Test
    void solicitanteNaoRecebeNotasInternasNaConversa() {
        UsuarioAtual bruna = atendente();
        atendimento.registrarAtualizacao("VF-0001", publica("Guincho a caminho"), bruna);
        atendimento.registrarAtualizacao("VF-0001", interna("Conferir contrato"), bruna);
        atendimento.registrarAtualizacao("VF-0001", publica("Obrigada"), ana);

        assertThat(conversa.consultar("VF-0001", ana).mensagens())
                .extracting(MensagemResponse::texto, MensagemResponse::origem)
                .containsExactly(
                        Tuple.tuple("Guincho a caminho", OrigemDaMensagem.EQUIPE),
                        Tuple.tuple("Obrigada", OrigemDaMensagem.SOLICITANTE));
        assertThat(conversa.consultar("VF-0001", bruna).mensagens()).hasSize(3);
    }

    @Test
    void conversaTrazOArquivoVinculadoAMensagem() {
        ChamadoAnexo foto = anexoGuardado(VisibilidadeDoConteudo.SOLICITANTE, new Autor(ANA, "Ana"));
        anexoSeraGuardado(VisibilidadeDoConteudo.SOLICITANTE, ana, foto, true);
        given(ambiente.anexos.findByChamadoIdOrderByEnviadoEmAsc(chamado.getId())).willReturn(List.of(foto));

        atendimento.enviarArquivoNaConversa("VF-0001", FOTO, "Foto do pneu", true, "chave", ana);

        MensagemResponse mensagem = conversa.consultar("VF-0001", ana).mensagens().getFirst();
        assertThat(mensagem.anexo()).isNotNull();
        assertThat(mensagem.anexo().nome()).isEqualTo("pneu.png");
    }

    @Test
    void leituraAvancaOPontoEConcluiAsNotificacoes() {
        conversa.marcarComoLida("VF-0001", AGORA.minusMinutes(1), ana);

        then(leituras).should().avancar(chamado.getId(), ANA, AGORA.minusMinutes(1));
        assertThat(lidasPor).containsExactly(ANA);
    }

    @Test
    void leituraNaoAvancaAlemDoMomentoAtual() {
        conversa.marcarComoLida("VF-0001", AGORA.plusDays(1), ana);

        then(leituras).should().avancar(chamado.getId(), ANA, AGORA.withOffsetSameInstant(ZoneOffset.UTC));
    }

    @Test
    void gestorQueEscreveNoChamadoDoMotoristaAvisaOMotoristaEAEquipe() {
        Usuario solicitante = chamado.getSolicitante();
        chamado.assumirAtendimento(BRUNA, AGORA.minusMinutes(5));
        Autor gestor = new Autor(UUID.randomUUID(), "Gil Gestor");

        avisosDaConversa.mensagemDoSolicitante(chamado, "Já falei com o motorista", gestor, AGORA);

        assertThat(avisos).extracting(Aviso::destinatario).containsExactly(solicitante.getId(), BRUNA.id());
    }

    @Test
    void previaDaNotificacaoCortaMensagensLongas() {
        atendimento.registrarAtualizacao("VF-0001", publica("x".repeat(500)), atendente());

        assertThat(avisos.getFirst().mensagem()).endsWith("…").hasSizeLessThan(200);
    }
}
