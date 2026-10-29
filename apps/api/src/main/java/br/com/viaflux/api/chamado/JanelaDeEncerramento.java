package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;

@Component
class JanelaDeEncerramento {

    static final int DIAS_UTEIS_PARA_CONFIRMAR = 3;
    static final int DIAS_UTEIS_DE_ANTECEDENCIA_DO_LEMBRETE = 1;
    static final int DIAS_UTEIS_PARA_REABRIR = 5;

    private final RelogioDeHorasUteis expediente;

    JanelaDeEncerramento(RelogioDeHorasUteis expediente) {
        this.expediente = expediente;
    }

    Instant confirmacaoAte(Chamado chamado) {
        return chamado.getStatus() == StatusChamado.RESOLVIDO && chamado.getResolvidoEm() != null
                ? expediente.somarDiasUteis(chamado.getResolvidoEm().toInstant(), DIAS_UTEIS_PARA_CONFIRMAR)
                : null;
    }

    Instant lembreteEm(Chamado chamado) {
        return chamado.getStatus() == StatusChamado.RESOLVIDO && chamado.getResolvidoEm() != null
                ? expediente.somarDiasUteis(chamado.getResolvidoEm().toInstant(), DIAS_UTEIS_PARA_CONFIRMAR - DIAS_UTEIS_DE_ANTECEDENCIA_DO_LEMBRETE)
                : null;
    }

    Instant reaberturaAte(Chamado chamado) {
        OffsetDateTime fechadoEm = chamado.getFechadoEm();
        return chamado.getStatus() == StatusChamado.FECHADO && fechadoEm != null
                ? expediente.somarDiasUteis(fechadoEm.toInstant(), DIAS_UTEIS_PARA_REABRIR)
                : null;
    }
}
