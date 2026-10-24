package br.com.viaflux.api.chamado;

import org.junit.jupiter.api.Test;

import java.util.List;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.admin;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.atendente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoTriado;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

class VisaoGlobalDoAdminTests {

    @Test
    void adminVeNoDashboardAMesmaFilaEOMesmoResumoDoAtendente() {
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusHours(1));
        Chamado naFila = chamadoTriado("VF-0001", QUARTA_AS_DEZ, TipoChamado.LOGISTICA, 5, 5);
        Chamado emTriagem = chamadoAberto("VF-0002", QUARTA_AS_DEZ);
        given(ambiente.chamados.buscarAtivos(null)).willReturn(List.of(naFila, emTriagem));

        ConsultaDeChamadosService consulta = new ConsultaDeChamadosService(ambiente.acesso, ambiente.montagem);
        FiltrosDeChamados filtros = FiltrosDeChamados.de(null, null, null, null, null, null, null);

        ChamadosPageResponse filaDoAdmin = consulta.listar(filtros, 0, 20, admin());
        ChamadosPageResponse filaDoAtendente = consulta.listar(filtros, 0, 20, atendente());
        assertThat(filaDoAdmin.content()).extracting(ChamadoResumoResponse::id).containsExactly("VF-0001");
        assertThat(filaDoAdmin.content()).isEqualTo(filaDoAtendente.content());

        ResumoDeChamadosResponse resumoDoAdmin = consulta.resumir(filtros, admin());
        ResumoDeChamadosResponse resumoDoAtendente = consulta.resumir(filtros, atendente());
        assertThat(resumoDoAdmin.porStatus()).isEqualTo(resumoDoAtendente.porStatus());
        assertThat(resumoDoAdmin.porStatus()).containsEntry("Na fila", 1L).containsEntry("Aberto", 1L);
    }
}
