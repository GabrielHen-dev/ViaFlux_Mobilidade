package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.RegistroDeEntregasDeAlerta.EntregaPendente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;

@Service
public class AlertasDeSlaService {

    private static final Logger log = LoggerFactory.getLogger(AlertasDeSlaService.class);
    private static final Set<StatusChamado> STATUS_COM_PRAZO_CORRENDO = Set.of(
            StatusChamado.NA_FILA, StatusChamado.EM_ATENDIMENTO, StatusChamado.AGUARDANDO);

    private final ChamadoRepository chamados;
    private final DisparoDeAlertasDeSla disparo;
    private final RegistroDeEntregasDeAlerta registro;
    private final CanalDeAlertaDeSla canal;
    private final Clock relogio;

    public AlertasDeSlaService(ChamadoRepository chamados, DisparoDeAlertasDeSla disparo, RegistroDeEntregasDeAlerta registro,
                        CanalDeAlertaDeSla canal, Clock relogio) {
        this.chamados = chamados;
        this.disparo = disparo;
        this.registro = registro;
        this.canal = canal;
        this.relogio = relogio;
    }

    public void verificarPrazos() {
        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        chamados.idsComStatus(STATUS_COM_PRAZO_CORRENDO).forEach(chamadoId -> dispararSemInterromper(chamadoId, agora));
        registro.pendentes(agora).forEach(entrega -> entregarSemInterromper(entrega, agora));
    }

    private void dispararSemInterromper(UUID chamadoId, OffsetDateTime agora) {
        try {
            disparo.disparar(chamadoId, agora);
        } catch (RuntimeException falha) {
            log.warn("Não foi possível verificar os alertas de SLA do chamado {}: {}", chamadoId, falha.getMessage());
        }
    }

    private void entregarSemInterromper(EntregaPendente entrega, OffsetDateTime agora) {
        try {
            entregar(entrega, agora);
        } catch (RuntimeException falha) {
            log.warn("Não foi possível registrar a entrega do alerta de SLA {}: {}", entrega.id(), falha.getMessage());
        }
    }

    private void entregar(EntregaPendente entrega, OffsetDateTime agora) {
        if (canal.enviarPorEmail(entrega.destinatarioId(), entrega.codigoDoChamado(), entrega.assunto(), entrega.mensagem())) {
            registro.confirmar(entrega.id(), agora);
        } else {
            registro.registrarFalha(entrega.id(), agora);
        }
    }
}
