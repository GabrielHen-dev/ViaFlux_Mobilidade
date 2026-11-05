package br.com.viaflux.api.chamado;

import java.time.Instant;
import java.time.OffsetDateTime;

public final class Datas {

    private Datas() {
    }

    public static OffsetDateTime local(OffsetDateTime data) {
        return data == null ? null : data.atZoneSameInstant(ChamadoConfig.FUSO_DA_OPERACAO).toOffsetDateTime();
    }

    public static OffsetDateTime local(Instant instante) {
        return instante == null ? null : instante.atZone(ChamadoConfig.FUSO_DA_OPERACAO).toOffsetDateTime();
    }
}
