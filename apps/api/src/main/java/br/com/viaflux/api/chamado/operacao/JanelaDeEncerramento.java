package br.com.viaflux.api.chamado.operacao;


import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.StatusChamado;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;

@Component
public class JanelaDeEncerramento{

    public static final int DIAS_UTEIS_PARA_CONFIRMAR = 3;
    public static final int DIAS_UTEIS_DE_ANTECEDENCIA_DO_LEMBRETE = 1;
    public static final int DIAS_UTEIS_PARA_REABRIR = 5;

    private final RelogioDeHorasUteis expediente;

    public JanelaDeEncerramento(RelogioDeHorasUteis expediente) {
        this.expediente = expediente;
    }

    public Instant confirmacaoAte(Chamado chamado) {
        return chamado.getStatus() == StatusChamado.RESOLVIDO && chamado.getResolvidoEm() != null
                ? expediente.somarDiasUteis(chamado.getResolvidoEm().toInstant(), DIAS_UTEIS_PARA_CONFIRMAR)
                : null;
    }

    public Instant lembreteEm(Chamado chamado) {
        return chamado.getStatus() == StatusChamado.RESOLVIDO && chamado.getResolvidoEm() != null
                ? expediente.somarDiasUteis(chamado.getResolvidoEm().toInstant(), DIAS_UTEIS_PARA_CONFIRMAR - DIAS_UTEIS_DE_ANTECEDENCIA_DO_LEMBRETE)
                : null;
    }

    public Instant reaberturaAte(Chamado chamado) {
        OffsetDateTime fechadoEm = chamado.getFechadoEm();
        return chamado.getStatus() == StatusChamado.FECHADO && fechadoEm != null
                ? expediente.somarDiasUteis(fechadoEm.toInstant(), DIAS_UTEIS_PARA_REABRIR)
                : null;
    }
}
