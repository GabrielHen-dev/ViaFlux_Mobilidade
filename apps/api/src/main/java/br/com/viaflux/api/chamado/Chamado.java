package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.abertura.DadosDeAbertura;
import br.com.viaflux.api.chamado.classificacao.Contexto;
import br.com.viaflux.api.chamado.classificacao.Motivo;
import br.com.viaflux.api.usuario.Usuario;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "chamados")
public class Chamado {

    public static final String ESTADO_CLASSIFICADA = "CLASSIFICADA";
    public static final String ESTADO_REVISAO_PENDENTE = "REVISAO_PENDENTE";

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String cliente;

    @Column(nullable = false, length = 30)
    private String telefone;

    @Column(nullable = false, length = 120)
    private String modelo;

    @Column(nullable = false, length = 20)
    private String placa;

    @Column(nullable = false, columnDefinition = "text")
    private String descricao;

    @Embedded
    @AttributeOverride(name = "endereco", column = @Column(name = "localizacao", nullable = false, length = 255))
    private Localizacao localizacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusChamado status;

    @Column(name = "aberto_em", nullable = false, updatable = false)
    private OffsetDateTime abertoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "motivo_id")
    private Motivo motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contexto_id")
    private Contexto contexto;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_declarado", length = 40)
    private TipoChamado tipoDeclarado;

    @Column(name = "motivo_outro", length = 200)
    private String motivoOutro;

    @Column(name = "classificacao_estado", nullable = false, length = 30)
    private String classificacaoEstado = "PENDENTE_CLASSIFICACAO";

    @Column(name = "classificacao_versao", length = 40)
    private String classificacaoVersao;

    @Column(name = "roteamento_versao", length = 40)
    private String roteamentoVersao;

    @Column(name = "sla_versao", length = 40)
    private String slaVersao;

    @Column(name = "aberto_por_id")
    private UUID abertoPorId;

    @Column(name = "aberto_por_nome", length = 150)
    private String abertoPorNome;

    @Column(name = "resolucao_resumo", columnDefinition = "text")
    private String resolucaoResumo;

    @Column(name = "fechado_em")
    private OffsetDateTime fechadoEm;

    @Column(name = "episodio", nullable = false)
    private int episodio = 1;

    @Column(name = "lembrete_confirmacao_em")
    private OffsetDateTime lembreteConfirmacaoEm;

    @Column(name = "urgencia_declarada")
    private Integer urgenciaDeclarada;

    @Enumerated(EnumType.STRING)
    @Column(name = "classificacao_tipo", length = 40)
    private TipoChamado classificacaoTipo;

    @Column(name = "severidade")
    private Integer severidade;

    @Column(name = "urgencia")
    private Integer urgencia;

    @Enumerated(EnumType.STRING)
    @Column(name = "override_prioridade", length = 2)
    private Prioridade overridePrioridade;

    @Column(name = "override_justificativa", columnDefinition = "text")
    private String overrideJustificativa;

    @Column(name = "override_autor_id")
    private UUID overrideAutorId;

    @Column(name = "override_autor_nome", length = 150)
    private String overrideAutorNome;

    @Column(name = "override_definido_em")
    private OffsetDateTime overrideDefinidoEm;

    @Enumerated(EnumType.STRING)
    @Column(name = "departamento_codigo", length = 40)
    private TipoChamado departamento;

    @Enumerated(EnumType.STRING)
    @Column(name = "motivo_aguardando", length = 30)
    private MotivoAguardando motivoAguardando;

    @Column(name = "triagem_prazo_minutos", nullable = false)
    private int triagemPrazoMinutos;

    @Column(name = "triagem_limite", nullable = false)
    private OffsetDateTime triagemLimite;

    @Column(name = "triagem_iniciada_em")
    private OffsetDateTime triagemIniciadaEm;

    @Column(name = "triagem_responsavel_id")
    private UUID triagemResponsavelId;

    @Column(name = "triagem_responsavel_nome", length = 150)
    private String triagemResponsavelNome;

    @Column(name = "triado_em")
    private OffsetDateTime triadoEm;

    @Column(name = "triado_por_id")
    private UUID triadoPorId;

    @Column(name = "triado_por_nome", length = 150)
    private String triadoPorNome;

    @Column(name = "primeira_resposta_em")
    private OffsetDateTime primeiraRespostaEm;

    @Column(name = "atendimento_responsavel_id")
    private UUID atendimentoResponsavelId;

    @Column(name = "atendimento_responsavel_nome", length = 150)
    private String atendimentoResponsavelNome;

    @Column(name = "atendimento_assumido_em")
    private OffsetDateTime atendimentoAssumidoEm;

    @Column(name = "resolvido_em")
    private OffsetDateTime resolvidoEm;

    @Column(name = "cancelado_em")
    private OffsetDateTime canceladoEm;

    @Column(name = "cancelado_por_id")
    private UUID canceladoPorId;

    @Column(name = "cancelado_por_nome", length = 150)
    private String canceladoPorNome;

    @Column(name = "cancelamento_motivo", columnDefinition = "text")
    private String cancelamentoMotivo;

    @Column(name = "escalonado_em")
    private OffsetDateTime escalonadoEm;

    @Column(name = "escalonado_por_id")
    private UUID escalonadoPorId;

    @Column(name = "escalonado_por_nome", length = 150)
    private String escalonadoPorNome;

    @Column(name = "escalonamento_motivo", columnDefinition = "text")
    private String escalonamentoMotivo;

    @Column(name = "chave_idempotencia", length = 160, updatable = false)
    private String chaveIdempotencia;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "chamado_pausa", joinColumns = @JoinColumn(name = "chamado_id"))
    @BatchSize(size = 100)
    private List<PausaDoChamado> pausas = new ArrayList<>();

    protected Chamado() {
    }

    public Chamado(String codigo, DadosDeAbertura dados, OffsetDateTime abertoEm) {
        this.id = UUID.randomUUID();
        this.codigo = codigo;
        this.cliente = dados.cliente().trim();
        this.telefone = texto(dados.telefone());
        this.modelo = dados.modelo();
        this.placa = texto(dados.placa()).toUpperCase(Locale.ROOT);
        this.descricao = texto(dados.descricao());
        this.localizacao = Localizacao.de(dados.localizacao());
        this.status = StatusChamado.ABERTO;
        this.abertoEm = abertoEm;
        this.atualizadoEm = abertoEm;
        this.solicitante = dados.solicitante();
        this.motivo = dados.motivo();
        this.contexto = dados.contexto();
        this.tipoDeclarado = dados.motivo() == null ? null : dados.motivo().getTipo();
        this.motivoOutro = dados.motivoOutro();
        this.classificacaoEstado = "PENDENTE_CLASSIFICACAO";
        this.abertoPorId = dados.abertoPorId();
        this.abertoPorNome = dados.abertoPorNome();
        this.urgenciaDeclarada = dados.contexto() == null ? null : dados.contexto().getUrgencia();
        this.triagemPrazoMinutos = dados.prazoDeTriagemMinutos();
        this.triagemLimite = abertoEm.plusMinutes(dados.prazoDeTriagemMinutos());
        this.chaveIdempotencia = dados.chaveIdempotencia();
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }

    public boolean triado() {
        return triadoEm != null;
    }

    public void exigirTriagemConcluida() {
        exigirNaoCancelado();
        if (!triado()) {
            throw ErroDeChamado.conflito("Conclua a triagem do chamado antes desta ação.");
        }
    }

    public boolean revisaoPendente() {
        return ESTADO_REVISAO_PENDENTE.equals(classificacaoEstado);
    }

    public boolean aguardaAnalise() {
        return !cancelado() && (!triado() || revisaoPendente());
    }

    public boolean cancelado() {
        return status == StatusChamado.CANCELADO;
    }

    private void exigirNaoCancelado() {
        if (cancelado()) {
            throw ErroDeChamado.conflito("Este chamado está cancelado. Reabra o chamado antes desta ação.");
        }
    }

    public void iniciarTriagem(Autor responsavel, OffsetDateTime agora) {
        exigirNaoCancelado();
        if (!aguardaAnalise()) {
            throw ErroDeChamado.conflito("A classificação deste chamado já foi analisada.");
        }
        if (!triado()) {
            this.status = StatusChamado.EM_TRIAGEM;
        }
        if (triagemIniciadaEm == null) {
            this.triagemIniciadaEm = agora;
        }
        this.triagemResponsavelId = responsavel.id();
        this.triagemResponsavelNome = responsavel.nome();
        tocar(agora);
    }

    public void concluirTriagem(TipoChamado tipo, int severidade, int urgencia, TipoChamado destino, Autor autor, OffsetDateTime agora) {
        exigirNaoCancelado();
        if (triado()) {
            throw ErroDeChamado.conflito("A triagem deste chamado já foi concluída.");
        }
        classificar(tipo, severidade, urgencia);
        this.departamento = destino;
        this.classificacaoEstado = "CLASSIFICADA";
        this.status = StatusChamado.NA_FILA;
        if (triagemIniciadaEm == null) {
            this.triagemIniciadaEm = agora;
        }
        this.triagemResponsavelId = autor.id();
        this.triagemResponsavelNome = autor.nome();
        this.triadoEm = agora;
        this.triadoPorId = autor.id();
        this.triadoPorNome = autor.nome();
        this.roteamentoVersao = "roteamento-v1";
        this.slaVersao = "sla-v1";
        tocar(agora);
    }

    public void confirmarClassificacao(Autor revisor, OffsetDateTime agora) {
        exigirNaoCancelado();
        if (!revisaoPendente()) {
            throw ErroDeChamado.conflito("A classificação deste chamado não está pendente de revisão.");
        }
        this.classificacaoEstado = ESTADO_CLASSIFICADA;
        this.triagemResponsavelId = revisor.id();
        this.triagemResponsavelNome = revisor.nome();
        tocar(agora);
    }

    public void reclassificar(TipoChamado tipo, int severidade, int urgencia, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (tipo == classificacaoTipo && severidade == this.severidade && urgencia == this.urgencia) {
            throw ErroDeChamado.conflito("A classificação informada é igual à vigente.");
        }
        classificar(tipo, severidade, urgencia);
        tocar(agora);
    }

    private void classificar(TipoChamado tipo, int severidade, int urgencia) {
        this.classificacaoTipo = tipo;
        this.severidade = severidade;
        this.urgencia = urgencia;
        this.classificacaoEstado = "CLASSIFICADA";
        this.classificacaoVersao = "classificacao-v1";
    }

    public void classificarAutomaticamente(TipoChamado tipo, int severidade, int urgencia, TipoChamado destino, OffsetDateTime agora) {
        if (triado()) return;
        classificar(tipo, severidade, urgencia);
        this.departamento = destino;
        this.status = StatusChamado.NA_FILA;
        this.triagemIniciadaEm = agora;
        this.triadoEm = agora;
        this.triadoPorNome = "Classificação automática";
        this.roteamentoVersao = "roteamento-v1";
        this.slaVersao = "sla-v1";
        tocar(agora);
    }

    public void classificarPorTexto(TipoChamado tipo, int severidade, int urgencia, TipoChamado destino, OffsetDateTime agora) {
        classificarAutomaticamente(tipo, severidade, urgencia, destino, agora);
        this.classificacaoEstado = ESTADO_REVISAO_PENDENTE;
        this.triadoPorNome = "Classificação automática por texto";
    }

    public void cancelar(Autor autor, String motivo, OffsetDateTime agora) {
        if (cancelado()) {
            throw ErroDeChamado.conflito("Este chamado já está cancelado.");
        }
        if (status == StatusChamado.RESOLVIDO || status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Chamados resolvidos ou fechados não podem ser cancelados.");
        }
        encerrarPausa(agora);
        this.status = StatusChamado.CANCELADO;
        this.motivoAguardando = null;
        this.canceladoEm = agora;
        this.canceladoPorId = autor.id();
        this.canceladoPorNome = autor.nome();
        this.cancelamentoMotivo = motivo.trim();
        tocar(agora);
    }

    public StatusChamado reabrirCancelado(OffsetDateTime agora) {
        if (!cancelado()) {
            throw ErroDeChamado.conflito("Só é possível reabrir um chamado cancelado.");
        }
        PausaDoChamado periodoCancelado = new PausaDoChamado(canceladoEm);
        periodoCancelado.encerrar(agora);
        pausas.add(periodoCancelado);
        this.status = !triado() ? StatusChamado.ABERTO
                : atendimentoResponsavelNome == null ? StatusChamado.NA_FILA : StatusChamado.EM_ATENDIMENTO;
        this.canceladoEm = null;
        this.canceladoPorId = null;
        this.canceladoPorNome = null;
        this.cancelamentoMotivo = null;
        limparEscalonamento();
        tocar(agora);
        return status;
    }

    public void escalonar(Autor autor, String motivo, OffsetDateTime agora) {
        if (status == StatusChamado.RESOLVIDO || status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Chamados resolvidos ou fechados não podem ser escalonados.");
        }
        if (escalonadoEm != null) {
            throw ErroDeChamado.conflito("Este chamado já foi escalonado à liderança.");
        }
        this.escalonadoEm = agora;
        this.escalonadoPorId = autor.id();
        this.escalonadoPorNome = autor.nome();
        this.escalonamentoMotivo = motivo == null || motivo.isBlank() ? null : motivo.trim();
        tocar(agora);
    }

    public void marcarPendenteRoteamento(OffsetDateTime agora) {
        this.departamento = null;
        this.classificacaoEstado = "PENDENTE_ROTEAMENTO";
        this.classificacaoVersao = "classificacao-v1";
        this.roteamentoVersao = "roteamento-v1";
        this.status = StatusChamado.ABERTO;
        this.triadoEm = null;
        tocar(agora);
    }

    public void resolverComResumo(String resumo, Autor autor, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (resumo == null || resumo.isBlank()) throw ErroDeChamado.campoInvalido("resumoResolucao", "Informe o resumo da solução.");
        if (status == StatusChamado.FECHADO) throw ErroDeChamado.conflito("Chamados fechados não podem ser resolvidos.");
        this.resolucaoResumo = resumo.trim();
        this.status = StatusChamado.RESOLVIDO;
        this.resolvidoEm = agora;
        this.triadoPorId = triadoPorId == null ? autor.id() : triadoPorId;
        this.triadoPorNome = triadoPorNome == null ? autor.nome() : triadoPorNome;
        registrarPrimeiraResposta(agora);
        tocar(agora);
    }

    public void fecharAutomaticamente(OffsetDateTime agora) {
        if (status != StatusChamado.RESOLVIDO) return;
        status = StatusChamado.FECHADO;
        fechadoEm = agora;
        tocar(agora);
    }

    public void confirmarResolucao(OffsetDateTime agora) {
        exigirStatus(StatusChamado.RESOLVIDO, "Só é possível confirmar a solução de um chamado resolvido.");
        status = StatusChamado.FECHADO;
        fechadoEm = agora;
        tocar(agora);
    }

    public void contestarResolucao(OffsetDateTime agora) {
        exigirStatus(StatusChamado.RESOLVIDO, "Só é possível contestar a solução de um chamado resolvido.");
        status = atendimentoResponsavelNome == null ? StatusChamado.NA_FILA : StatusChamado.EM_ATENDIMENTO;
        resolvidoEm = null;
        lembreteConfirmacaoEm = null;
        tocar(agora);
    }

    public void reabrir(OffsetDateTime agora) {
        exigirStatus(StatusChamado.FECHADO, "Só é possível reabrir um chamado fechado.");
        status = StatusChamado.NA_FILA;
        episodio += 1;
        resolvidoEm = null;
        fechadoEm = null;
        lembreteConfirmacaoEm = null;
        motivoAguardando = null;
        limparEscalonamento();
        liberarResponsavel();
        tocar(agora);
    }

    public void registrarLembreteDeConfirmacao(OffsetDateTime agora) {
        lembreteConfirmacaoEm = agora;
    }

    private void exigirStatus(StatusChamado esperado, String mensagem) {
        if (status != esperado) {
            throw ErroDeChamado.conflito(mensagem);
        }
    }

    public void definirOverride(Prioridade prioridade, String justificativa, Autor autor, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (prioridade == prioridadeEfetiva()) {
            throw ErroDeChamado.conflito("A prioridade efetiva já é essa.");
        }
        this.overridePrioridade = prioridade;
        this.overrideJustificativa = justificativa;
        this.overrideAutorId = autor.id();
        this.overrideAutorNome = autor.nome();
        this.overrideDefinidoEm = agora;
        tocar(agora);
    }

    public Prioridade removerOverride(OffsetDateTime agora) {
        exigirNaoCancelado();
        if (overridePrioridade == null) {
            throw ErroDeChamado.conflito("O chamado não tem override de prioridade.");
        }
        Prioridade anterior = overridePrioridade;
        this.overridePrioridade = null;
        this.overrideJustificativa = null;
        this.overrideAutorId = null;
        this.overrideAutorNome = null;
        this.overrideDefinidoEm = null;
        tocar(agora);
        return anterior;
    }

    public StatusChamado alterarStatus(StatusChamado novo, MotivoAguardando motivo, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (novo.aguardaTriagem()) {
            throw ErroDeChamado.campoInvalido("status", "Abertura e triagem não podem ser definidas manualmente.");
        }
        if (novo == StatusChamado.CANCELADO) {
            throw ErroDeChamado.campoInvalido("status", "Use a ação de cancelar o chamado, que pede o motivo.");
        }
        if (novo == StatusChamado.AGUARDANDO && motivo == null) {
            throw ErroDeChamado.campoInvalido("motivoAguardando", "Informe quem está sendo aguardado: cliente, fornecedor ou outro departamento.");
        }
        StatusChamado anterior = status;
        if (anterior == StatusChamado.FECHADO) throw ErroDeChamado.conflito("Chamados fechados não podem mudar de status.");
        if (anterior == StatusChamado.RESOLVIDO && novo != StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Reabertura exige o fluxo específico de reabertura.");
        }
        boolean mesmoMotivo = novo != StatusChamado.AGUARDANDO || motivo == motivoAguardando;
        if (anterior == novo && mesmoMotivo) {
            throw ErroDeChamado.conflito("O chamado já está " + novo.getRotulo() + ".");
        }
        if (novo == StatusChamado.FECHADO && anterior != StatusChamado.RESOLVIDO) {
            throw ErroDeChamado.conflito("Só é possível fechar um chamado depois de resolvido.");
        }
        encerrarPausa(agora);
        this.status = novo;
        this.motivoAguardando = novo == StatusChamado.AGUARDANDO ? motivo : null;
        if (novo == StatusChamado.NA_FILA) {
            liberarResponsavel();
        }
        if (motivoAguardando == MotivoAguardando.CLIENTE) {
            pausas.add(new PausaDoChamado(agora));
        }
        if (novo == StatusChamado.EM_ATENDIMENTO || novo == StatusChamado.RESOLVIDO) {
            registrarPrimeiraResposta(agora);
        }
        if (novo == StatusChamado.RESOLVIDO) {
            this.resolvidoEm = agora;
        } else if (novo == StatusChamado.FECHADO) {
            this.fechadoEm = agora;
        }
        tocar(agora);
        return anterior;
    }

    public TipoChamado transferir(TipoChamado destino, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (destino == departamento) {
            throw ErroDeChamado.conflito("O chamado já está neste departamento.");
        }
        if (status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Chamados fechados não podem ser transferidos.");
        }
        TipoChamado origem = departamento;
        encerrarPausa(agora);
        this.departamento = destino;
        this.classificacaoEstado = "CLASSIFICADA";
        this.motivoAguardando = null;
        liberarResponsavel();
        if (status != StatusChamado.RESOLVIDO) {
            this.status = StatusChamado.NA_FILA;
        }
        tocar(agora);
        return origem;
    }

    public Autor transferirResponsavel(Autor novo, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (status == StatusChamado.RESOLVIDO || status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Chamados resolvidos ou fechados não podem mudar de responsável.");
        }
        if (novo.id().equals(atendimentoResponsavelId)) {
            throw ErroDeChamado.conflito(novo.nome() + " já é a pessoa responsável por este chamado.");
        }
        Autor anterior = getAtendimentoResponsavel();
        if (status == StatusChamado.NA_FILA) {
            this.status = StatusChamado.EM_ATENDIMENTO;
        }
        definirResponsavel(novo, agora);
        tocar(agora);
        return anterior;
    }

    public void assumirAtendimento(Autor responsavel, OffsetDateTime agora) {
        exigirTriagemConcluida();
        if (status == StatusChamado.RESOLVIDO || status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Chamados resolvidos ou fechados não podem ser assumidos.");
        }
        if (status == StatusChamado.EM_ATENDIMENTO && responsavel.id() != null && responsavel.id().equals(atendimentoResponsavelId)) {
            throw ErroDeChamado.conflito("Você já está com este chamado.");
        }
        encerrarPausa(agora);
        this.status = StatusChamado.EM_ATENDIMENTO;
        this.motivoAguardando = null;
        definirResponsavel(responsavel, agora);
        registrarPrimeiraResposta(agora);
        tocar(agora);
    }

    public void registrarResponsavelSeAusente(Autor responsavel, OffsetDateTime agora) {
        if (atendimentoResponsavelNome == null) {
            definirResponsavel(responsavel, agora);
        }
    }

    private void definirResponsavel(Autor responsavel, OffsetDateTime agora) {
        this.atendimentoResponsavelId = responsavel.id();
        this.atendimentoResponsavelNome = responsavel.nome();
        this.atendimentoAssumidoEm = agora;
    }

    private void limparEscalonamento() {
        this.escalonadoEm = null;
        this.escalonadoPorId = null;
        this.escalonadoPorNome = null;
        this.escalonamentoMotivo = null;
    }

    private void liberarResponsavel() {
        this.atendimentoResponsavelId = null;
        this.atendimentoResponsavelNome = null;
        this.atendimentoAssumidoEm = null;
    }

    public void exigirConversaAberta() {
        if (cancelado()) {
            throw ErroDeChamado.conflito("Este chamado está cancelado. A conversa volta a funcionar quando ele for reaberto.");
        }
        if (status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Este chamado está fechado. A conversa volta a funcionar na reabertura.");
        }
    }

    public void exigirAnexosAbertos() {
        if (cancelado()) {
            throw ErroDeChamado.conflito("Este chamado está cancelado e não recebe novos arquivos.");
        }
        if (status == StatusChamado.FECHADO) {
            throw ErroDeChamado.conflito("Este chamado está fechado e não recebe novos arquivos.");
        }
    }

    public boolean aguardaCliente() {
        return status == StatusChamado.AGUARDANDO && motivoAguardando == MotivoAguardando.CLIENTE;
    }

    public void registrarPrimeiraResposta(OffsetDateTime agora) {
        if (primeiraRespostaEm == null && triado()) {
            this.primeiraRespostaEm = agora;
        }
    }

    public void atualizarLocalizacao(DadosDeLocalizacao dados, OffsetDateTime agora) {
        exigirNaoCancelado();
        this.localizacao = Localizacao.de(dados);
        tocar(agora);
    }

    public void tocar(OffsetDateTime agora) {
        if (agora.isAfter(atualizadoEm)) {
            this.atualizadoEm = agora;
        }
    }

    private void encerrarPausa(OffsetDateTime agora) {
        pausas.stream().filter(PausaDoChamado::emAndamento).forEach(pausa -> pausa.encerrar(agora));
    }

    public Prioridade prioridadeCalculada() {
        return triado() ? Prioridade.porScore(score()) : null;
    }

    public Prioridade prioridadeEfetiva() {
        return overridePrioridade != null ? overridePrioridade : prioridadeCalculada();
    }

    public Integer score() {
        return triado() ? Prioridade.score(severidade, urgencia) : null;
    }

    public TipoChamado tipoVigente() {
        return classificacaoTipo != null ? classificacaoTipo : tipoDeclarado;
    }

    public boolean pertenceAo(UUID usuarioId) {
        return solicitante != null && solicitante.getId().equals(usuarioId);
    }

    public UUID getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public String getCliente() {
        return cliente;
    }

    public String getTelefone() {
        return telefone;
    }

    public String getModelo() {
        return modelo;
    }

    public String getPlaca() {
        return placa;
    }

    public String getDescricao() {
        return descricao;
    }

    public Localizacao getLocalizacao() {
        return localizacao;
    }

    public StatusChamado getStatus() {
        return status;
    }

    public OffsetDateTime getAbertoEm() {
        return abertoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public Usuario getSolicitante() {
        return solicitante;
    }

    public Motivo getMotivo() {
        return motivo;
    }

    public Contexto getContexto() {
        return contexto;
    }

    public Integer getUrgenciaDeclarada() {
        return urgenciaDeclarada;
    }

    public TipoChamado getClassificacaoTipo() {
        return classificacaoTipo;
    }

    public Integer getSeveridade() {
        return severidade;
    }

    public Integer getUrgencia() {
        return urgencia;
    }

    public Prioridade getOverridePrioridade() {
        return overridePrioridade;
    }

    public String getOverrideJustificativa() {
        return overrideJustificativa;
    }

    public Autor getOverrideAutor() {
        return Autor.de(overrideAutorId, overrideAutorNome);
    }

    public OffsetDateTime getOverrideDefinidoEm() {
        return overrideDefinidoEm;
    }

    public TipoChamado getDepartamento() {
        return departamento;
    }

    public MotivoAguardando getMotivoAguardando() {
        return motivoAguardando;
    }

    public int getTriagemPrazoMinutos() {
        return triagemPrazoMinutos;
    }

    public OffsetDateTime getTriagemLimite() {
        return triagemLimite;
    }

    public OffsetDateTime getTriagemIniciadaEm() {
        return triagemIniciadaEm;
    }

    public Autor getTriagemResponsavel() {
        return Autor.de(triagemResponsavelId, triagemResponsavelNome);
    }

    public OffsetDateTime getTriadoEm() {
        return triadoEm;
    }

    public Autor getTriadoPor() {
        return Autor.de(triadoPorId, triadoPorNome);
    }

    public Autor getAtendimentoResponsavel() {
        return Autor.de(atendimentoResponsavelId, atendimentoResponsavelNome);
    }

    public OffsetDateTime getAtendimentoAssumidoEm() {
        return atendimentoAssumidoEm;
    }

    public OffsetDateTime getPrimeiraRespostaEm() {
        return primeiraRespostaEm;
    }

    public OffsetDateTime getResolvidoEm() {
        return resolvidoEm;
    }

    public OffsetDateTime getCanceladoEm() {
        return canceladoEm;
    }

    public Autor getCanceladoPor() {
        return Autor.de(canceladoPorId, canceladoPorNome);
    }

    public String getCancelamentoMotivo() {
        return cancelamentoMotivo;
    }

    public OffsetDateTime getEscalonadoEm() {
        return escalonadoEm;
    }

    public Autor getEscalonadoPor() {
        return Autor.de(escalonadoPorId, escalonadoPorNome);
    }

    public String getEscalonamentoMotivo() {
        return escalonamentoMotivo;
    }

    public String getMotivoOutro() { return motivoOutro; }
    public String getClassificacaoEstado() { return classificacaoEstado; }
    public UUID getAbertoPorId() { return abertoPorId; }
    public String getAbertoPorNome() { return abertoPorNome; }
    public String getResolucaoResumo() { return resolucaoResumo; }
    public OffsetDateTime getFechadoEm() { return fechadoEm; }
    public int getEpisodio() { return episodio; }
    public OffsetDateTime getLembreteConfirmacaoEm() { return lembreteConfirmacaoEm; }
    public String getClassificacaoVersao() { return classificacaoVersao; }
    public String getRoteamentoVersao() { return roteamentoVersao; }
    public String getSlaVersao() { return slaVersao; }

    public List<PausaDoChamado> getPausas() {
        return List.copyOf(pausas);
    }
}
