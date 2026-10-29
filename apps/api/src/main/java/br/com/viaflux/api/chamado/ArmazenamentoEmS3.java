package br.com.viaflux.api.chamado;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.util.Arrays;
import java.util.List;

class ArmazenamentoEmS3 implements ArmazenamentoDeArquivos, AutoCloseable {

    private static final int STATUS_NAO_ENCONTRADO = 404;
    private static final String TIPO_GENERICO = "application/octet-stream";

    private final S3Client cliente;
    private final String bucket;
    private final String prefixo;

    ArmazenamentoEmS3(S3Client cliente, String bucket, String prefixo) {
        this.cliente = cliente;
        this.bucket = bucket;
        this.prefixo = normalizarPrefixo(prefixo);
    }

    static ArmazenamentoEmS3 conectar(AnexosProperties.ConexaoS3 conexao) {
        validar(conexao);
        S3Client cliente = S3Client.builder()
                .endpointOverride(URI.create(conexao.endpoint().trim()))
                .region(Region.of(conexao.regiaoEfetiva()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(conexao.accessKeyId().trim(), conexao.secretAccessKey().trim())))
                .forcePathStyle(conexao.usaPathStyle())
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .build();
        return new ArmazenamentoEmS3(cliente, conexao.bucket().trim(), conexao.prefixo());
    }

    static void validar(AnexosProperties.ConexaoS3 conexao) {
        List<String> ausentes = conexao.configuracoesAusentes();
        if (!ausentes.isEmpty()) {
            throw new IllegalStateException("viaflux.anexos.armazenamento=s3 exige as configurações: "
                    + String.join(", ", ausentes) + ".");
        }
        String endpoint = conexao.endpoint().trim();
        if (!endpoint.startsWith("https://") && !endpoint.startsWith("http://")) {
            throw new IllegalStateException("viaflux.anexos.s3.endpoint (S3_ENDPOINT) precisa começar com https:// ou http://, "
                    + "por exemplo https://<ACCOUNT_ID>.r2.cloudflarestorage.com.");
        }
    }

    @Override
    public void guardar(String nome, InputStream conteudo) {
        String chave = chaveDe(nome);
        byte[] dados;
        try {
            dados = conteudo.readAllBytes();
        } catch (IOException erro) {
            throw new UncheckedIOException("Não foi possível guardar o anexo.", erro);
        }
        PutObjectRequest requisicao = PutObjectRequest.builder()
                .bucket(bucket)
                .key(chave)
                .contentType(tipoPelaAssinatura(dados))
                .contentLength((long) dados.length)
                .build();
        try {
            cliente.putObject(requisicao, RequestBody.fromBytes(dados));
        } catch (SdkException erro) {
            throw new IllegalStateException("Não foi possível guardar o anexo.", erro);
        }
    }

    @Override
    public InputStream abrir(String nome) {
        GetObjectRequest requisicao = GetObjectRequest.builder().bucket(bucket).key(chaveDe(nome)).build();
        try {
            return cliente.getObject(requisicao);
        } catch (NoSuchKeyException erro) {
            throw arquivoIndisponivel();
        } catch (S3Exception erro) {
            if (erro.statusCode() == STATUS_NAO_ENCONTRADO) {
                throw arquivoIndisponivel();
            }
            throw new IllegalStateException("Não foi possível ler o anexo.", erro);
        } catch (SdkException erro) {
            throw new IllegalStateException("Não foi possível ler o anexo.", erro);
        }
    }

    @Override
    public void remover(String nome) {
        DeleteObjectRequest requisicao = DeleteObjectRequest.builder().bucket(bucket).key(chaveDe(nome)).build();
        try {
            cliente.deleteObject(requisicao);
        } catch (SdkException erro) {
            throw new IllegalStateException("Não foi possível remover o anexo.", erro);
        }
    }

    @Override
    public void close() {
        cliente.close();
    }

    String chaveDe(String nome) {
        boolean invalido = nome == null
                || nome.isBlank()
                || nome.startsWith("/")
                || nome.contains("\\")
                || Arrays.stream(nome.split("/")).anyMatch(trecho -> trecho.equals("..") || trecho.equals("."));
        if (invalido) {
            throw ErroDeChamado.invalido("Nome de arquivo inválido.");
        }
        return prefixo + nome;
    }

    private static ErroDeChamado arquivoIndisponivel() {
        return ErroDeChamado.naoEncontrado("O arquivo do anexo não está mais disponível.");
    }

    private static String normalizarPrefixo(String prefixo) {
        if (prefixo == null) {
            return "";
        }
        String semBarrasNasPontas = prefixo.trim().replaceAll("^/+", "").replaceAll("/+$", "");
        return semBarrasNasPontas.isEmpty() ? "" : semBarrasNasPontas + "/";
    }

    private static String tipoPelaAssinatura(byte[] dados) {
        if (comecaCom(dados, 0x89, 'P', 'N', 'G')) {
            return "image/png";
        }
        if (comecaCom(dados, 0xFF, 0xD8, 0xFF)) {
            return "image/jpeg";
        }
        if (comecaCom(dados, '%', 'P', 'D', 'F')) {
            return "application/pdf";
        }
        return TIPO_GENERICO;
    }

    private static boolean comecaCom(byte[] dados, int... assinatura) {
        if (dados.length < assinatura.length) {
            return false;
        }
        for (int i = 0; i < assinatura.length; i++) {
            if ((dados[i] & 0xFF) != assinatura[i]) {
                return false;
            }
        }
        return true;
    }
}
