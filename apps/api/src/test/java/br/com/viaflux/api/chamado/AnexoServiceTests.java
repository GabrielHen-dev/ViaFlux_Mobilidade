package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.autor;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.erroAo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.errosDeCampo;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

class AnexoServiceTests {

    private static final UUID ANA = UUID.randomUUID();
    private static final byte[] FOTO = "conteudo-da-foto".getBytes(StandardCharsets.UTF_8);

    private final AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusMinutes(5));
    private final ChamadoAnexoRepository anexos = mock(ChamadoAnexoRepository.class);
    private final ArmazenamentoEmMemoria armazenamento = new ArmazenamentoEmMemoria();
    private final AnexoService servico = new AnexoService(ambiente.acesso, anexos, armazenamento, ambiente.historico,
            new AnexosProperties(Path.of("nao-usado"), 1), ambiente.relogio);
    private final UsuarioAtual ana = cliente(ANA);
    private Chamado chamado;

    @BeforeEach
    void preparar() {
        chamado = ambiente.cadastrar(chamadoAberto("VF-0001", QUARTA_AS_DEZ, usuario(ANA, "Ana Cliente", "CLIENTE"), TipoChamado.MANUTENCAO, 3));
        given(anexos.save(any(ChamadoAnexo.class))).willAnswer(invocacao -> invocacao.getArgument(0));
    }

    @Test
    void guardaOArquivoERegistraNoHistoricoParaTodos() {
        AnexoService.Resultado resultado = servico.enviar("VF-0001", foto("pneu.png"), null, ana);

        assertThat(resultado.criado()).isTrue();
        assertThat(resultado.anexo().nome()).isEqualTo("pneu.png");
        assertThat(resultado.anexo().tipoConteudo()).isEqualTo("image/png");
        assertThat(resultado.anexo().tamanho()).isEqualTo(FOTO.length);
        assertThat(resultado.anexo().autor()).isEqualTo(autor(ana));
        assertThat(armazenamento.arquivos).containsOnlyKeys(resultado.anexo().id().toString());
        assertThat(armazenamento.arquivos.get(resultado.anexo().id().toString())).isEqualTo(FOTO);
        ChamadoEvento evento = ambiente.unicoEventoDoTipo(TipoEvento.ANEXO);
        assertThat(evento.getDetalhe()).isEqualTo("pneu.png");
        assertThat(evento.isVisivelCliente()).isTrue();
    }

    @Test
    void reenvioComAMesmaChaveDevolveOAnexoJaGuardado() {
        String chaveDaAna = ANA + ":chave-1";
        ChamadoAnexo existente = new ChamadoAnexo(chamado, "pneu.png", "image/png", FOTO.length, autor(ana), chaveDaAna, QUARTA_AS_DEZ);
        given(anexos.findByChamadoIdAndChaveIdempotencia(chamado.getId(), chaveDaAna)).willReturn(Optional.of(existente));

        AnexoService.Resultado resultado = servico.enviar("VF-0001", foto("pneu.png"), " chave-1 ", ana);

        assertThat(resultado.criado()).isFalse();
        assertThat(resultado.anexo().id()).isEqualTo(existente.getId());
        assertThat(armazenamento.arquivos).isEmpty();
        then(anexos).should(never()).save(any());
    }

    @Test
    void aMesmaChaveDeOutroUsuarioNaoDevolveOAnexoDaAna() {
        ChamadoAnexo daAna = new ChamadoAnexo(chamado, "pneu.png", "image/png", FOTO.length, autor(ana), ANA + ":chave-1", QUARTA_AS_DEZ);
        given(anexos.findByChamadoIdAndChaveIdempotencia(chamado.getId(), ANA + ":chave-1")).willReturn(Optional.of(daAna));
        UsuarioAtual paula = atendente();

        AnexoService.Resultado resultado = servico.enviar("VF-0001", foto("laudo.png"), "chave-1", paula);

        assertThat(resultado.criado()).isTrue();
        assertThat(resultado.anexo().nome()).isEqualTo("laudo.png");
        then(anexos).should().findByChamadoIdAndChaveIdempotencia(chamado.getId(), paula.id() + ":chave-1");
    }

    @Test
    void trocaSeparadoresDeCaminhoNoNomeDoArquivo() {
        AnexoService.Resultado resultado = servico.enviar("VF-0001", foto("..\\../etc/passwd.png"), null, ana);

        assertThat(resultado.anexo().nome()).isEqualTo(".._.._etc_passwd.png");
    }

    @Test
    void usaUmNomePadraoQuandoOArquivoVemSemNome() {
        AnexoService.Resultado resultado = servico.enviar("VF-0001", new MockMultipartFile("arquivo", "", "application/pdf", FOTO), null, ana);

        assertThat(resultado.anexo().nome()).isEqualTo("arquivo");
    }

    @Test
    void recusaArquivoVazioOuAusente() {
        ErroDeChamado semArquivo = erroAo(() -> servico.enviar("VF-0001", null, null, ana));
        ErroDeChamado vazio = erroAo(() -> servico.enviar("VF-0001", new MockMultipartFile("arquivo", "a.png", "image/png", new byte[0]), null, ana));

        assertThat(semArquivo.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errosDeCampo(semArquivo)).containsEntry("arquivo", "Selecione um arquivo.");
        assertThat(vazio.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(armazenamento.arquivos).isEmpty();
    }

    @Test
    void recusaFormatoNaoSuportado() {
        ErroDeChamado erro = erroAo(() -> servico.enviar("VF-0001", new MockMultipartFile("arquivo", "virus.exe", "application/octet-stream", FOTO), null, ana));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        assertThat(erro.getBody().getDetail()).startsWith("\"virus.exe\" não foi aceito");
        assertThat(armazenamento.arquivos).isEmpty();
        assertThat(ambiente.registrados).isEmpty();
    }

    @Test
    void recusaArquivoAcimaDoLimite() {
        byte[] grandeDemais = new byte[1024 * 1024 + 1];

        ErroDeChamado erro = erroAo(() -> servico.enviar("VF-0001", new MockMultipartFile("arquivo", "laudo.pdf", "application/pdf", grandeDemais), null, ana));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(erro.getBody().getDetail()).isEqualTo("\"laudo.pdf\" não foi aceito: o limite é de 1 MB por arquivo.");
    }

    @Test
    void quemNaoEnxergaOChamadoNaoEnviaNemBaixaAnexos() {
        UsuarioAtual outroCliente = cliente(UUID.randomUUID());

        assertThatThrownBy(() -> servico.enviar("VF-0001", foto("pneu.png"), null, outroCliente))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThatThrownBy(() -> servico.abrir("VF-0001", UUID.randomUUID(), outroCliente))
                .isInstanceOf(ChamadoNaoEncontradoException.class);
        assertThat(armazenamento.arquivos).isEmpty();
    }

    @Test
    void abreOConteudoGuardadoDoAnexo() throws IOException {
        servico.enviar("VF-0001", foto("pneu.png"), null, ana);
        ArgumentCaptor<ChamadoAnexo> salvo = ArgumentCaptor.forClass(ChamadoAnexo.class);
        then(anexos).should().save(salvo.capture());
        UUID anexoId = salvo.getValue().getId();
        given(anexos.findByIdAndChamadoId(anexoId, chamado.getId())).willReturn(Optional.of(salvo.getValue()));

        AnexoService.Conteudo conteudo = servico.abrir("VF-0001", anexoId, atendente());

        assertThat(conteudo.nome()).isEqualTo("pneu.png");
        assertThat(conteudo.tipoConteudo()).isEqualTo("image/png");
        assertThat(conteudo.tamanho()).isEqualTo(FOTO.length);
        try (InputStream dados = conteudo.dados()) {
            assertThat(dados.readAllBytes()).isEqualTo(FOTO);
        }
    }

    @Test
    void anexoDeOutroChamadoNaoEhEncontrado() {
        UUID anexoId = UUID.randomUUID();
        given(anexos.findByIdAndChamadoId(anexoId, chamado.getId())).willReturn(Optional.empty());

        ErroDeChamado erro = erroAo(() -> servico.abrir("VF-0001", anexoId, ana));

        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(erro.getBody().getDetail()).isEqualTo("Anexo não encontrado.");
    }

    private static MockMultipartFile foto(String nome) {
        return new MockMultipartFile("arquivo", nome, "image/png", FOTO);
    }

    static final class ArmazenamentoEmMemoria implements ArmazenamentoDeArquivos {

        final Map<String, byte[]> arquivos = new HashMap<>();

        @Override
        public void guardar(String nome, InputStream conteudo) {
            try {
                arquivos.put(nome, conteudo.readAllBytes());
            } catch (IOException erro) {
                throw new UncheckedIOException(erro);
            }
        }

        @Override
        public InputStream abrir(String nome) {
            byte[] dados = arquivos.get(nome);
            if (dados == null) {
                throw new IllegalStateException("Arquivo inexistente: " + nome);
            }
            return new ByteArrayInputStream(dados);
        }

        @Override
        public void remover(String nome) {
            arquivos.remove(nome);
        }
    }
}
