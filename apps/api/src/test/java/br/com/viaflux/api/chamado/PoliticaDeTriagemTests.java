package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.politicaDeTriagem;
import static org.assertj.core.api.Assertions.assertThat;

class PoliticaDeTriagemTests {

    private static final Autor PAULA = new Autor(UUID.randomUUID(), "Paula Atendente");

    private final PoliticaDeTriagem politica = politicaDeTriagem();

    @ParameterizedTest
    @CsvSource({"5, 10", "3, 20", "1, 40"})
    void prazoDaTriagemSaiDaUrgenciaDeclaradaPeloCliente(int urgencia, int minutosEsperados) {
        assertThat(politica.prazoEmMinutos(urgencia)).isEqualTo(minutosEsperados);
    }

    @Test
    void urgenciaDesconhecidaUsaOPrazoMedio() {
        assertThat(politica.prazoEmMinutos(null)).isEqualTo(20);
        assertThat(politica.prazoEmMinutos(2)).isEqualTo(20);
    }

    @Test
    void prazosSaoConfiguraveis() {
        PoliticaDeTriagem personalizada = new PoliticaDeTriagem(new PrazosDeTriagemProperties(5, 15, 60), ChamadosDeTeste.RELOGIO_CORRIDO);

        assertThat(personalizada.prazoEmMinutos(5)).isEqualTo(5);
        assertThat(personalizada.prazoEmMinutos(3)).isEqualTo(15);
        assertThat(personalizada.prazoEmMinutos(1)).isEqualTo(60);
    }

    @ParameterizedTest
    @CsvSource({"4, NO_PRAZO", "5, EM_RISCO", "9, EM_RISCO", "10, VIOLADO", "30, VIOLADO"})
    void triagemPendenteFicaEmRiscoNaMetadeDoPrazoEAtrasadaAoEstourar(int minutosDesdeAAbertura, SituacaoPrazo esperada) {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 5);

        TriagemResponse triagem = politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(minutosDesdeAAbertura).toInstant());

        assertThat(triagem.situacao()).isEqualTo(esperada);
    }

    @Test
    void informaLimiteEResponsavelNoHorarioDaOperacao() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 5);
        chamado.iniciarTriagem(PAULA, QUARTA_AS_DEZ.plusMinutes(2));

        TriagemResponse triagem = politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(3).toInstant());

        assertThat(triagem.prazoMinutos()).isEqualTo(10);
        assertThat(triagem.limite()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(10)));
        assertThat(triagem.limite().getOffset().getTotalSeconds()).isEqualTo(-3 * 3600);
        assertThat(triagem.iniciadaEm()).isEqualTo(Datas.local(QUARTA_AS_DEZ.plusMinutes(2)));
        assertThat(triagem.responsavel()).isEqualTo(PAULA);
        assertThat(triagem.concluidaEm()).isNull();
        assertThat(triagem.concluidaPor()).isNull();
    }

    @Test
    void triagemConcluidaDentroDoPrazoEhCumprida() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 5);
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, PAULA, QUARTA_AS_DEZ.plusMinutes(8));

        TriagemResponse triagem = politica.avaliar(chamado, QUARTA_AS_DEZ.plusHours(3).toInstant());

        assertThat(triagem.situacao()).isEqualTo(SituacaoPrazo.CUMPRIDO);
        assertThat(triagem.concluidaPor()).isEqualTo(PAULA);
    }

    @Test
    void triagemConcluidaDepoisDoLimiteEhCumpridaComAtraso() {
        Chamado chamado = chamadoAberto("VF-0001", QUARTA_AS_DEZ, null, TipoChamado.MANUTENCAO, 5);
        chamado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, PAULA, QUARTA_AS_DEZ.plusMinutes(12));

        assertThat(politica.avaliar(chamado, QUARTA_AS_DEZ.plusMinutes(12).toInstant()).situacao())
                .isEqualTo(SituacaoPrazo.CUMPRIDO_COM_ATRASO);
    }
}
