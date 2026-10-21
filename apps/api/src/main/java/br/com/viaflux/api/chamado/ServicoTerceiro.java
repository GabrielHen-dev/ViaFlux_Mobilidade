package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Organizacao;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "servico_terceiro")
class ServicoTerceiro {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chamado_id", nullable = false, updatable = false)
    private Chamado chamado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fornecedor_id", nullable = false, updatable = false)
    private Organizacao fornecedor;

    @Column(name = "tipo_servico", nullable = false, length = 120)
    private String tipoServico;

    @Column(nullable = false, length = 255)
    private String local;

    @Column(nullable = false, columnDefinition = "text")
    private String observacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusServico status;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @Column(nullable = false)
    private boolean cancelado;

    @OneToMany(mappedBy = "servico", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("registradoEm ASC")
    @BatchSize(size = 50)
    private List<ServicoAtualizacao> historico = new ArrayList<>();

    protected ServicoTerceiro() {
    }

    ServicoTerceiro(Chamado chamado, Organizacao fornecedor, String tipoServico, String local, String observacao, Autor autor, OffsetDateTime agora) {
        this.id = UUID.randomUUID();
        this.chamado = chamado;
        this.fornecedor = fornecedor;
        this.tipoServico = tipoServico;
        this.local = local;
        this.observacao = observacao;
        this.status = StatusServico.SOLICITADO;
        this.atualizadoEm = agora;
        historico.add(new ServicoAtualizacao(this, StatusServico.SOLICITADO, observacao, autor, agora));
    }

    void atualizar(StatusServico novo, String observacao, Autor autor, OffsetDateTime agora) {
        if (novo == StatusServico.SOLICITADO) {
            throw ErroDeChamado.campoInvalido("status", "Use Recebido, Em execução ou Concluído.");
        }
        if (cancelado) {
            throw ErroDeChamado.conflito("Este serviço foi cancelado pela Central.");
        }
        if (status == StatusServico.CONCLUIDO) {
            throw ErroDeChamado.conflito("Este serviço já foi concluído.");
        }
        if (!status.vemAntesDe(novo)) {
            throw ErroDeChamado.conflito("O serviço já está " + status.getRotulo() + ". Só é possível avançar o status.");
        }
        this.status = novo;
        this.atualizadoEm = agora;
        historico.add(new ServicoAtualizacao(this, novo, observacao, autor, agora));
    }

    void cancelar(OffsetDateTime agora) {
        this.cancelado = true;
        this.atualizadoEm = agora;
    }

    boolean emAndamento() {
        return !cancelado && status != StatusServico.CONCLUIDO;
    }

    UUID getId() {
        return id;
    }

    Chamado getChamado() {
        return chamado;
    }

    Organizacao getFornecedor() {
        return fornecedor;
    }

    String getTipoServico() {
        return tipoServico;
    }

    String getLocal() {
        return local;
    }

    String getObservacao() {
        return observacao;
    }

    StatusServico getStatus() {
        return status;
    }

    OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    boolean isCancelado() {
        return cancelado;
    }

    List<ServicoAtualizacao> getHistorico() {
        return List.copyOf(historico);
    }
}
