package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Component
public class RegistroDeEntregasDeAlerta {

    public record EntregaPendente(UUID id, UUID destinatarioId, String codigoDoChamado, String assunto, String mensagem) {
    }

    private final EntregaDeAlertaDeSlaRepository entregas;
    private final HistoricoDoChamado historico;

    public RegistroDeEntregasDeAlerta(EntregaDeAlertaDeSlaRepository entregas, HistoricoDoChamado historico) {
        this.entregas = entregas;
        this.historico = historico;
    }

    @Transactional(readOnly = true)
    public List<EntregaPendente> pendentes(OffsetDateTime agora) {
        return entregas.findTop100ByEstadoAndProximaTentativaEmLessThanEqualOrderByProximaTentativaEmAsc(EstadoDaEntregaDeAlerta.PENDENTE, agora)
                .stream()
                .map(entrega -> new EntregaPendente(entrega.getId(), entrega.getDestinatarioId(),
                        entrega.getAlerta().getChamado().getCodigo(), entrega.getAssunto(), entrega.getMensagem()))
                .toList();
    }

    @Transactional
    public void confirmar(UUID entregaId, OffsetDateTime agora) {
        entregas.findById(entregaId).ifPresent(entrega -> {
            boolean recuperada = entrega.jaFalhou();
            entrega.confirmar(agora);
            if (recuperada) {
                historico.registrarAlerta(entrega.getAlerta().getChamado(), TipoEvento.NOTIFICACAO, "Alerta de SLA reenviado",
                        entrega.getAssunto() + " · e-mail entregue a " + entrega.getDestinatarioNome()
                                + " na tentativa " + entrega.getTentativas(), agora);
            }
        });
    }

    @Transactional
    public void registrarFalha(UUID entregaId, OffsetDateTime agora) {
        entregas.findById(entregaId).ifPresent(entrega -> {
            boolean primeiraFalha = !entrega.jaFalhou();
            entrega.registrarFalha(agora);
            if (entrega.getEstado() == EstadoDaEntregaDeAlerta.ESGOTADA) {
                historico.registrarAlerta(entrega.getAlerta().getChamado(), TipoEvento.NOTIFICACAO, "Falha definitiva no alerta de SLA",
                        entrega.getAssunto() + " · e-mail não entregue a " + entrega.getDestinatarioNome()
                                + " após " + entrega.getTentativas() + " tentativas", agora);
            } else if (primeiraFalha) {
                historico.registrarAlerta(entrega.getAlerta().getChamado(), TipoEvento.NOTIFICACAO, "Falha na entrega de alerta de SLA",
                        entrega.getAssunto() + " · e-mail não entregue a " + entrega.getDestinatarioNome()
                                + " · nova tentativa programada", agora);
            }
        });
    }
}
