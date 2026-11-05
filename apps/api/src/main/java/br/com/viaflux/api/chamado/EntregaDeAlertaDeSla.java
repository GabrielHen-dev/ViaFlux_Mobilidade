package br.com.viaflux.api.chamado;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerta_sla_entrega")
public class EntregaDeAlertaDeSla {

    public static final int MAXIMO_DE_TENTATIVAS = 5;
    static final Duration ESPERA_ENTRE_TENTATIVAS = Duration.ofMinutes(5);

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alerta_id", nullable = false, updatable = false)
    private AlertaDeSla alerta;

    @Column(name = "destinatario_id", nullable = false, updatable = false)
    private UUID destinatarioId;

    @Column(name = "destinatario_nome", nullable = false, updatable = false)
    private String destinatarioNome;

    @Column(nullable = false, length = 80, updatable = false)
    private String assunto;

    @Column(nullable = false, updatable = false)
    private String mensagem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoDaEntregaDeAlerta estado = EstadoDaEntregaDeAlerta.PENDENTE;

    @Column(nullable = false)
    private int tentativas;

    @Column(name = "proxima_tentativa_em")
    private OffsetDateTime proximaTentativaEm;

    @Column(name = "ultima_falha_em")
    private OffsetDateTime ultimaFalhaEm;

    @Column(name = "entregue_em")
    private OffsetDateTime entregueEm;

    protected EntregaDeAlertaDeSla() {
    }

    public EntregaDeAlertaDeSla(AlertaDeSla alerta, UUID destinatarioId, String destinatarioNome, String assunto, String mensagem, OffsetDateTime criadaEm) {
        this.id = UUID.randomUUID();
        this.alerta = alerta;
        this.destinatarioId = destinatarioId;
        this.destinatarioNome = destinatarioNome;
        this.assunto = assunto;
        this.mensagem = mensagem;
        this.proximaTentativaEm = criadaEm;
    }

    public void confirmar(OffsetDateTime instante) {
        tentativas += 1;
        estado = EstadoDaEntregaDeAlerta.ENTREGUE;
        entregueEm = instante;
        proximaTentativaEm = null;
    }

    public void registrarFalha(OffsetDateTime instante) {
        tentativas += 1;
        ultimaFalhaEm = instante;
        if (tentativas >= MAXIMO_DE_TENTATIVAS) {
            estado = EstadoDaEntregaDeAlerta.ESGOTADA;
            proximaTentativaEm = null;
        } else {
            proximaTentativaEm = instante.plus(ESPERA_ENTRE_TENTATIVAS.multipliedBy(1L << (tentativas - 1)));
        }
    }

    public boolean jaFalhou() {
        return ultimaFalhaEm != null;
    }

    public UUID getId() {
        return id;
    }

    public AlertaDeSla getAlerta() {
        return alerta;
    }

    public UUID getDestinatarioId() {
        return destinatarioId;
    }

    public String getDestinatarioNome() {
        return destinatarioNome;
    }

    public String getAssunto() {
        return assunto;
    }

    public String getMensagem() {
        return mensagem;
    }

    public EstadoDaEntregaDeAlerta getEstado() {
        return estado;
    }

    public int getTentativas() {
        return tentativas;
    }

    public OffsetDateTime getProximaTentativaEm() {
        return proximaTentativaEm;
    }
}
