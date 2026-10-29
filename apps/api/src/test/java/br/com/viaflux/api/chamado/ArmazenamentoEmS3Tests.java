package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;

class ArmazenamentoEmS3Tests {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 1, 2, 3};
    private static final byte[] PDF = "%PDF-1.7 conteudo".getBytes(StandardCharsets.US_ASCII);

    private final S3Client cliente = mock(S3Client.class);
    private final ArmazenamentoEmS3 armazenamento = new ArmazenamentoEmS3(cliente, "viaflux-anexos", "anexos/");

    @Test
    void guardaOsBytesNaChaveComPrefixoETipoDetectado() throws IOException {
        armazenamento.guardar("3f1c-uuid", new ByteArrayInputStream(PNG));

        ArgumentCaptor<PutObjectRequest> requisicao = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> corpo = ArgumentCaptor.forClass(RequestBody.class);
        then(cliente).should().putObject(requisicao.capture(), corpo.capture());
        assertThat(requisicao.getValue().bucket()).isEqualTo("viaflux-anexos");
        assertThat(requisicao.getValue().key()).isEqualTo("anexos/3f1c-uuid");
        assertThat(requisicao.getValue().contentType()).isEqualTo("image/png");
        assertThat(requisicao.getValue().contentLength()).isEqualTo(PNG.length);
        assertThat(requisicao.getValue().acl()).isNull();
        try (InputStream enviado = corpo.getValue().contentStreamProvider().newStream()) {
            assertThat(enviado.readAllBytes()).isEqualTo(PNG);
        }
    }

    @Test
    void detectaPdfEUsaTipoGenericoParaAssinaturaDesconhecida() {
        armazenamento.guardar("documento", new ByteArrayInputStream(PDF));
        armazenamento.guardar("outro", new ByteArrayInputStream("texto".getBytes(StandardCharsets.UTF_8)));

        ArgumentCaptor<PutObjectRequest> requisicoes = ArgumentCaptor.forClass(PutObjectRequest.class);
        then(cliente).should(times(2)).putObject(requisicoes.capture(), any(RequestBody.class));
        assertThat(requisicoes.getAllValues()).extracting(PutObjectRequest::contentType)
                .containsExactly("application/pdf", "application/octet-stream");
    }

    @Test
    void normalizaOPrefixo() {
        assertThat(new ArmazenamentoEmS3(cliente, "b", null).chaveDe("abc")).isEqualTo("abc");
        assertThat(new ArmazenamentoEmS3(cliente, "b", "").chaveDe("abc")).isEqualTo("abc");
        assertThat(new ArmazenamentoEmS3(cliente, "b", "  ").chaveDe("abc")).isEqualTo("abc");
        assertThat(new ArmazenamentoEmS3(cliente, "b", "anexos").chaveDe("abc")).isEqualTo("anexos/abc");
        assertThat(new ArmazenamentoEmS3(cliente, "b", "/anexos/").chaveDe("abc")).isEqualTo("anexos/abc");
        assertThat(new ArmazenamentoEmS3(cliente, "b", "viaflux/anexos//").chaveDe("abc")).isEqualTo("viaflux/anexos/abc");
    }

    @Test
    void recusaNomesQueEscapamDoPrefixo() {
        for (String nome : new String[]{"", " ", "/abc", "../abc", "a/../b", "./abc", "a\\b"}) {
            assertThatThrownBy(() -> armazenamento.guardar(nome, new ByteArrayInputStream(PNG)))
                    .isInstanceOfSatisfying(ErroDeChamado.class,
                            erro -> assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        }
        verifyNoInteractions(cliente);
    }

    @Test
    void abreOConteudoGuardado() throws IOException {
        given(cliente.getObject(any(GetObjectRequest.class))).willReturn(new ResponseInputStream<>(
                GetObjectResponse.builder().contentLength((long) PNG.length).build(),
                AbortableInputStream.create(new ByteArrayInputStream(PNG))));

        try (InputStream dados = armazenamento.abrir("3f1c-uuid")) {
            assertThat(dados.readAllBytes()).isEqualTo(PNG);
        }

        ArgumentCaptor<GetObjectRequest> requisicao = ArgumentCaptor.forClass(GetObjectRequest.class);
        then(cliente).should().getObject(requisicao.capture());
        assertThat(requisicao.getValue().bucket()).isEqualTo("viaflux-anexos");
        assertThat(requisicao.getValue().key()).isEqualTo("anexos/3f1c-uuid");
    }

    @Test
    void objetoInexistenteViraNaoEncontrado() {
        given(cliente.getObject(any(GetObjectRequest.class)))
                .willThrow(NoSuchKeyException.builder().statusCode(404).message("missing").build());

        assertThatThrownBy(() -> armazenamento.abrir("sumiu"))
                .isInstanceOfSatisfying(ErroDeChamado.class, erro -> {
                    assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(erro.getBody().getDetail()).isEqualTo("O arquivo do anexo não está mais disponível.");
                });
    }

    @Test
    void respostaGenerica404TambemViraNaoEncontrado() {
        given(cliente.getObject(any(GetObjectRequest.class)))
                .willThrow(S3Exception.builder().statusCode(404).message("Not Found").build());

        assertThatThrownBy(() -> armazenamento.abrir("sumiu"))
                .isInstanceOfSatisfying(ErroDeChamado.class,
                        erro -> assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void falhaDoProvedorNaoViraNaoEncontrado() {
        given(cliente.getObject(any(GetObjectRequest.class)))
                .willThrow(S3Exception.builder().statusCode(403).message("Access Denied").build());

        assertThatThrownBy(() -> armazenamento.abrir("qualquer"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Não foi possível ler o anexo.");
    }

    @Test
    void falhaAoGuardarInformaOMotivo() {
        given(cliente.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(SdkClientException.create("sem conexão"));

        assertThatThrownBy(() -> armazenamento.guardar("abc", new ByteArrayInputStream(PNG)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Não foi possível guardar o anexo.");
    }

    @Test
    void removeAChaveComPrefixo() {
        armazenamento.remover("3f1c-uuid");

        ArgumentCaptor<DeleteObjectRequest> requisicao = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        then(cliente).should().deleteObject(requisicao.capture());
        assertThat(requisicao.getValue().bucket()).isEqualTo("viaflux-anexos");
        assertThat(requisicao.getValue().key()).isEqualTo("anexos/3f1c-uuid");
    }

    @Test
    void falhaAoRemoverInformaOMotivo() {
        given(cliente.deleteObject(any(DeleteObjectRequest.class))).willThrow(SdkClientException.create("sem conexão"));

        assertThatThrownBy(() -> armazenamento.remover("abc"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Não foi possível remover o anexo.");
    }

    @Test
    void fecharEncerraOCliente() {
        armazenamento.close();

        then(cliente).should().close();
    }
}
