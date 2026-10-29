package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class ArmazenamentoDeArquivosConfigTests {

    private static final String SEGREDO = "segredo-que-nao-pode-vazar";

    private final ApplicationContextRunner contexto = new ApplicationContextRunner()
            .withUserConfiguration(ChamadoConfig.class);

    @Test
    void semConfiguracaoUsaODisco() {
        contexto.run(aplicacao -> {
            assertThat(aplicacao).hasNotFailed();
            assertThat(aplicacao).hasSingleBean(ArmazenamentoDeArquivos.class);
            assertThat(aplicacao.getBean(ArmazenamentoDeArquivos.class)).isInstanceOf(ArmazenamentoEmDisco.class);
        });
    }

    @Test
    void s3CompletoCriaApenasOArmazenamentoEmS3() {
        contexto.withPropertyValues(
                "viaflux.anexos.armazenamento=s3",
                "viaflux.anexos.s3.endpoint=https://conta.r2.cloudflarestorage.com",
                "viaflux.anexos.s3.bucket=viaflux-anexos",
                "viaflux.anexos.s3.access-key-id=chave",
                "viaflux.anexos.s3.secret-access-key=" + SEGREDO,
                "viaflux.anexos.s3.prefixo=anexos/"
        ).run(aplicacao -> {
            assertThat(aplicacao).hasNotFailed();
            assertThat(aplicacao).hasSingleBean(ArmazenamentoDeArquivos.class);
            assertThat(aplicacao.getBean(ArmazenamentoDeArquivos.class)).isInstanceOf(ArmazenamentoEmS3.class);
            AnexosProperties propriedades = aplicacao.getBean(AnexosProperties.class);
            assertThat(propriedades.s3().regiaoEfetiva()).isEqualTo("auto");
            assertThat(propriedades.s3().usaPathStyle()).isTrue();
            assertThat(propriedades.toString()).doesNotContain(SEGREDO);
        });
    }

    @Test
    void valoresVaziosVindosDoAmbienteUsamOsPadroes() {
        contexto.withPropertyValues(
                "viaflux.anexos.armazenamento=",
                "viaflux.anexos.s3.regiao=",
                "viaflux.anexos.s3.path-style="
        ).run(aplicacao -> {
            assertThat(aplicacao).hasNotFailed();
            assertThat(aplicacao.getBean(ArmazenamentoDeArquivos.class)).isInstanceOf(ArmazenamentoEmDisco.class);
            AnexosProperties propriedades = aplicacao.getBean(AnexosProperties.class);
            assertThat(propriedades.s3().regiaoEfetiva()).isEqualTo("auto");
            assertThat(propriedades.s3().usaPathStyle()).isTrue();
        });
    }

    @Test
    void s3IncompletoImpedeASubidaListandoOQueFalta() {
        contexto.withPropertyValues(
                "viaflux.anexos.armazenamento=s3",
                "viaflux.anexos.s3.endpoint=https://conta.r2.cloudflarestorage.com",
                "viaflux.anexos.s3.secret-access-key=" + SEGREDO
        ).run(aplicacao -> {
            assertThat(aplicacao).hasFailed();
            Throwable causa = causaRaiz(aplicacao.getStartupFailure());
            assertThat(causa).isInstanceOf(IllegalStateException.class);
            assertThat(causa.getMessage())
                    .contains("viaflux.anexos.s3.bucket (S3_BUCKET)")
                    .contains("viaflux.anexos.s3.access-key-id (S3_ACCESS_KEY_ID)")
                    .doesNotContain("S3_ENDPOINT")
                    .doesNotContain("S3_SECRET_ACCESS_KEY")
                    .doesNotContain(SEGREDO);
        });
    }

    @Test
    void endpointSemProtocoloImpedeASubida() {
        contexto.withPropertyValues(
                "viaflux.anexos.armazenamento=s3",
                "viaflux.anexos.s3.endpoint=conta.r2.cloudflarestorage.com",
                "viaflux.anexos.s3.bucket=viaflux-anexos",
                "viaflux.anexos.s3.access-key-id=chave",
                "viaflux.anexos.s3.secret-access-key=" + SEGREDO
        ).run(aplicacao -> {
            assertThat(aplicacao).hasFailed();
            assertThat(causaRaiz(aplicacao.getStartupFailure()).getMessage())
                    .contains("S3_ENDPOINT")
                    .contains("https://")
                    .doesNotContain(SEGREDO);
        });
    }

    @Test
    void tipoDeArmazenamentoDesconhecidoImpedeASubida() {
        contexto.withPropertyValues("viaflux.anexos.armazenamento=r2")
                .run(aplicacao -> assertThat(aplicacao).hasFailed());
    }

    private static Throwable causaRaiz(Throwable erro) {
        Throwable atual = erro;
        while (atual.getCause() != null) {
            atual = atual.getCause();
        }
        return atual;
    }
}
