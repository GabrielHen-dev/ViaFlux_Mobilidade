package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static br.com.viaflux.api.chamado.ChamadosDeTeste.QUARTA_AS_DEZ;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.chamadoAberto;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.cliente;
import static br.com.viaflux.api.chamado.ChamadosDeTeste.usuario;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

class HistoricoDoClienteTests {

    @Test
    void incluiFechadosEOrdenaAtivosAntesDosEncerradosPelaUltimaAtualizacao() {
        UUID clienteId = UUID.randomUUID();
        Usuario solicitante = usuario(clienteId, "Cliente", "CLIENTE");
        Autor atendente = new Autor(UUID.randomUUID(), "Atendente");
        AmbienteDeChamados ambiente = new AmbienteDeChamados(QUARTA_AS_DEZ.plusHours(2));

        Chamado aberto = chamadoAberto("VF-0001", QUARTA_AS_DEZ, solicitante, TipoChamado.MANUTENCAO, 3);
        Chamado naFila = chamadoAberto("VF-0002", QUARTA_AS_DEZ.plusMinutes(1), solicitante, TipoChamado.MANUTENCAO, 3);
        naFila.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, atendente, QUARTA_AS_DEZ.plusMinutes(6));
        Chamado aguardando = chamadoAberto("VF-0003", QUARTA_AS_DEZ.plusMinutes(2), solicitante, TipoChamado.MANUTENCAO, 3);
        aguardando.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, atendente, QUARTA_AS_DEZ.plusMinutes(7));
        aguardando.alterarStatus(StatusChamado.AGUARDANDO, MotivoAguardando.FORNECEDOR, QUARTA_AS_DEZ.plusMinutes(10));
        Chamado resolvido = chamadoAberto("VF-0004", QUARTA_AS_DEZ.plusMinutes(3), solicitante, TipoChamado.MANUTENCAO, 3);
        resolvido.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, atendente, QUARTA_AS_DEZ.plusMinutes(8));
        resolvido.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(20));
        Chamado fechado = chamadoAberto("VF-0005", QUARTA_AS_DEZ.plusMinutes(4), solicitante, TipoChamado.MANUTENCAO, 3);
        fechado.concluirTriagem(TipoChamado.MANUTENCAO, 3, 3, TipoChamado.MANUTENCAO, atendente, QUARTA_AS_DEZ.plusMinutes(9));
        fechado.alterarStatus(StatusChamado.RESOLVIDO, null, QUARTA_AS_DEZ.plusMinutes(21));
        fechado.alterarStatus(StatusChamado.FECHADO, null, QUARTA_AS_DEZ.plusMinutes(30));
        given(ambiente.chamados.buscarAtivos(null)).willReturn(List.of(fechado, aberto, resolvido, naFila, aguardando));

        ConsultaDeChamadosService consulta = new ConsultaDeChamadosService(ambiente.acesso, ambiente.montagem);
        FiltrosDeChamados filtros = FiltrosDeChamados.de(null, null, null, null, null, null, "ativos_recentes");

        assertThat(consulta.listar(filtros, 0, 3, cliente(clienteId)).content())
                .extracting(ChamadoResumoResponse::id).containsExactly("VF-0003", "VF-0002", "VF-0001");
        ChamadosPageResponse segundaPagina = consulta.listar(filtros, 1, 3, cliente(clienteId));
        assertThat(segundaPagina.content()).extracting(ChamadoResumoResponse::id).containsExactly("VF-0005", "VF-0004");
        assertThat(segundaPagina.totalElements()).isEqualTo(5);
        assertThat(segundaPagina.totalPages()).isEqualTo(2);
    }
}
