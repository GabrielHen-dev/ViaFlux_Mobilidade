package br.com.viaflux.api.chamado.triagem;


import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.Datas;
import br.com.viaflux.api.chamado.sla.AvaliacaoDePrazo;
import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class PoliticaDeTriagem{

    private final PrazosDeTriagemProperties prazos;
    private final RelogioCorrido relogio;

    public PoliticaDeTriagem(PrazosDeTriagemProperties prazos, RelogioCorrido relogio) {
        this.prazos = prazos;
        this.relogio = relogio;
    }

    public int prazoEmMinutos(Integer urgenciaDeclarada) {
        return prazos.minutosPara(urgenciaDeclarada);
    }

    public TriagemResponse avaliar(Chamado chamado, Instant agora) {
        Instant concluidaEm = chamado.getTriadoEm() == null ? null : chamado.getTriadoEm().toInstant();
        AvaliacaoDePrazo avaliacao = AvaliacaoDePrazo.avaliar(
                relogio, chamado.getAbertoEm().toInstant(), chamado.getTriagemPrazoMinutos(), 0, concluidaEm, agora);
        return new TriagemResponse(
                Datas.local(chamado.getTriagemLimite()),
                chamado.getTriagemPrazoMinutos(),
                Datas.local(chamado.getTriagemIniciadaEm()),
                chamado.getTriagemResponsavel(),
                Datas.local(chamado.getTriadoEm()),
                chamado.getTriadoPor(),
                avaliacao.situacao(),
                chamado.revisaoPendente()
        );
    }
}
