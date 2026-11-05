package br.com.viaflux.api.chamado.anexo;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@ConfigurationProperties(prefix = "viaflux.anexos")
public record AnexosProperties(
        @DefaultValue("./data/anexos") Path diretorio,
        @DefaultValue("10") int limiteMb,
        @DefaultValue("disco") TipoDeArmazenamento armazenamento,
        @DefaultValue ConexaoS3 s3
) {

    static final Set<String> TIPOS_PERMITIDOS = Set.of("image/png", "image/jpeg", "application/pdf");

    public enum TipoDeArmazenamento {
        DISCO,
        S3
    }

    @ConstructorBinding
    public AnexosProperties {
        armazenamento = armazenamento == null ? TipoDeArmazenamento.DISCO : armazenamento;
        s3 = s3 == null ? ConexaoS3.vazia() : s3;
    }

    public AnexosProperties(Path diretorio, int limiteMb) {
        this(diretorio, limiteMb, TipoDeArmazenamento.DISCO, ConexaoS3.vazia());
    }

    public long limiteBytes() {
        return limiteMb * 1024L * 1024L;
    }

    public record ConexaoS3(
            String endpoint,
            @DefaultValue("auto") String regiao,
            String bucket,
            String accessKeyId,
            String secretAccessKey,
            @DefaultValue("") String prefixo,
            @DefaultValue("true") Boolean pathStyle
    ) {

        public static final String REGIAO_PADRAO = "auto";

        public static ConexaoS3 vazia() {
            return new ConexaoS3(null, REGIAO_PADRAO, null, null, null, "", true);
        }

        public String regiaoEfetiva() {
            return regiao == null || regiao.isBlank() ? REGIAO_PADRAO : regiao.trim();
        }

        public boolean usaPathStyle() {
            return pathStyle == null || pathStyle;
        }

        public List<String> configuracoesAusentes() {
            List<String> ausentes = new ArrayList<>();
            if (endpoint == null || endpoint.isBlank()) {
                ausentes.add("viaflux.anexos.s3.endpoint (S3_ENDPOINT)");
            }
            if (bucket == null || bucket.isBlank()) {
                ausentes.add("viaflux.anexos.s3.bucket (S3_BUCKET)");
            }
            if (accessKeyId == null || accessKeyId.isBlank()) {
                ausentes.add("viaflux.anexos.s3.access-key-id (S3_ACCESS_KEY_ID)");
            }
            if (secretAccessKey == null || secretAccessKey.isBlank()) {
                ausentes.add("viaflux.anexos.s3.secret-access-key (S3_SECRET_ACCESS_KEY)");
            }
            return ausentes;
        }

        @Override
        public String toString() {
            return "ConexaoS3[endpoint=" + endpoint + ", regiao=" + regiaoEfetiva() + ", bucket=" + bucket
                    + ", prefixo=" + prefixo + ", pathStyle=" + usaPathStyle() + ", credenciais=***]";
        }
    }
}
