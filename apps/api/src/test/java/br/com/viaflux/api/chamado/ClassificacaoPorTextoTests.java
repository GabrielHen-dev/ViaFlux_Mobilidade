package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.motivo;
import static org.assertj.core.api.Assertions.assertThat;

class ClassificacaoPorTextoTests {

    private final List<Motivo> motivos = List.of(
            motivoDescrito(TipoChamado.ASSISTENCIA_24H, "Pneu furado / Roda danificada / Avaria leve", 3),
            motivoDescrito(TipoChamado.MANUTENCAO, "Falha no sistema de freios, direção ou suspensão", 5),
            motivoDescrito(TipoChamado.FINANCEIRO, "Solicitação de 2ª via de boleto ou nota fiscal", 1),
            motivoDescrito(TipoChamado.TI, "Queda total de internet ou rede na filial", 5)
    );

    @Test
    void relatoParecidoComUmMotivoUsaOTipoEASeveridadeDele() {
        ClassificacaoPorTexto.Sugestao sugestao = ClassificacaoPorTexto.sugerir("Preciso da segunda via do boleto e da nota fiscal", motivos);

        assertThat(sugestao.tipo()).isEqualTo(TipoChamado.FINANCEIRO);
        assertThat(sugestao.severidade()).isEqualTo(1);
        assertThat(sugestao.motivo()).isNotNull();
        assertThat(sugestao.termos()).contains("boleto", "nota", "fiscal");
    }

    @Test
    void relatoSemMotivoProximoUsaOVocabularioDaArea() {
        ClassificacaoPorTexto.Sugestao sugestao = ClassificacaoPorTexto.sugerir("O contrato vence logo, quero renovação", motivos);

        assertThat(sugestao.tipo()).isEqualTo(TipoChamado.CONTRATOS);
        assertThat(sugestao.severidade()).isEqualTo(3);
        assertThat(sugestao.motivo()).isNull();
    }

    @Test
    void sinaisDeRiscoElevamAUrgencia() {
        ClassificacaoPorTexto.Sugestao sugestao = ClassificacaoPorTexto.sugerir("Freio com falha e direção pesada, parado na rodovia", motivos);

        assertThat(sugestao.tipo()).isEqualTo(TipoChamado.MANUTENCAO);
        assertThat(sugestao.urgencia()).isEqualTo(5);
    }

    @Test
    void relatoSemNenhumTermoConhecidoVaiParaAAssistenciaComPesoMedio() {
        ClassificacaoPorTexto.Sugestao sugestao = ClassificacaoPorTexto.sugerir("Olá", motivos);

        assertThat(sugestao.tipo()).isEqualTo(ClassificacaoPorTexto.TIPO_SEM_CORRESPONDENCIA);
        assertThat(sugestao.severidade()).isEqualTo(3);
        assertThat(sugestao.urgencia()).isEqualTo(3);
        assertThat(sugestao.termos()).isEmpty();
    }

    private static Motivo motivoDescrito(TipoChamado tipo, String descricao, int severidade) {
        Motivo motivo = motivo(tipo, severidade);
        ReflectionTestUtils.setField(motivo, "descricao", descricao);
        return motivo;
    }
}
