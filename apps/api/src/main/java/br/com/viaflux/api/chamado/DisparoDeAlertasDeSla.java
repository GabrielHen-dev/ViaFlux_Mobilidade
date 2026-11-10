package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.DestinatariosDeAlertaDeSla.Destinatario;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
class DisparoDeAlertasDeSla {

    private final ChamadoRepository chamados;
    private final AlertaDeSlaRepository alertas;
    private final EntregaDeAlertaDeSlaRepository entregas;
    private final PoliticaDeSla politicaDeSla;
    private final DestinatariosDeAlertaDeSla destinatarios;
    private final RoteamentoComPlantao roteamento;
    private final CanalDeAlertaDeSla canal;
    private final HistoricoDoChamado historico;

    DisparoDeAlertasDeSla(ChamadoRepository chamados, AlertaDeSlaRepository alertas, EntregaDeAlertaDeSlaRepository entregas,
                          PoliticaDeSla politicaDeSla, DestinatariosDeAlertaDeSla destinatarios, RoteamentoComPlantao roteamento,
                          CanalDeAlertaDeSla canal, HistoricoDoChamado historico) {
        this.chamados = chamados;
        this.alertas = alertas;
        this.entregas = entregas;
        this.politicaDeSla = politicaDeSla;
        this.destinatarios = destinatarios;
        this.roteamento = roteamento;
        this.canal = canal;
        this.historico = historico;
    }

    @Transactional
    void disparar(UUID chamadoId, OffsetDateTime agora) {
        Chamado chamado = chamados.findById(chamadoId).filter(encontrado -> !encontrado.cancelado()).orElse(null);
        if (chamado == null) {
            return;
        }
        List<GatilhoDeSla> alcancados = politicaDeSla.gatilhosAlcancados(chamado, agora.toInstant());
        if (alcancados.isEmpty()) {
            return;
        }
        Set<GatilhoDeSla> jaDisparados = alertas.findByChamadoId(chamadoId).stream().map(AlertaDeSla::gatilho).collect(Collectors.toSet());
        Map<PrazoDeSla, Set<UUID>> avisadosPorPrazo = new EnumMap<>(PrazoDeSla.class);
        alcancados.stream()
                .filter(gatilho -> !jaDisparados.contains(gatilho))
                .sorted(Comparator.comparing(GatilhoDeSla::limiar).reversed())
                .forEach(gatilho -> dispararGatilho(chamado, gatilho,
                        avisadosPorPrazo.computeIfAbsent(gatilho.prazo(), prazo -> new HashSet<>()), agora));
    }

    private void dispararGatilho(Chamado chamado, GatilhoDeSla gatilho, Set<UUID> avisadosNoPrazo, OffsetDateTime agora) {
        Prioridade prioridade = chamado.prioridadeEfetiva();
        AlertaDeSla alerta = alertas.save(new AlertaDeSla(chamado, gatilho, prioridade, agora));
        String descricao = descricao(chamado, gatilho, prioridade, agora);
        historico.registrarAlerta(chamado, gatilho.limiar().tipoDoEvento(), gatilho.limiar().acao(), descricao, agora);

        List<Destinatario> doGatilho = destinatarios.doGatilho(chamado, gatilho.limiar());
        List<Destinatario> novos = doGatilho.stream().filter(destinatario -> avisadosNoPrazo.add(destinatario.id())).toList();
        novos.forEach(destinatario -> notificar(alerta, destinatario, gatilho.limiar().assunto(), descricao, agora));
        registrarNotificacoes(chamado, gatilho, doGatilho, novos, agora);
    }

    private void notificar(AlertaDeSla alerta, Destinatario destinatario, String assunto, String mensagem, OffsetDateTime agora) {
        Chamado chamado = alerta.getChamado();
        canal.registrarNoPortal(destinatario.id(), chamado.getId(), chamado.getCodigo(), assunto, mensagem, agora);
        entregas.save(new EntregaDeAlertaDeSla(alerta, destinatario.id(), destinatario.nome(), assunto, mensagem, agora));
    }

    private void registrarNotificacoes(Chamado chamado, GatilhoDeSla gatilho, List<Destinatario> doGatilho, List<Destinatario> novos, OffsetDateTime agora) {
        String assunto = gatilho.limiar().assunto() + " · " + gatilho.prazo().rotulo();
        if (doGatilho.isEmpty()) {
            historico.registrarAlerta(chamado, TipoEvento.NOTIFICACAO, "Alerta de SLA sem destinatário",
                    assunto + " · nenhum usuário ativo para receber o alerta", agora);
        } else if (novos.isEmpty()) {
            historico.registrarAlerta(chamado, TipoEvento.NOTIFICACAO, "Alerta de SLA já coberto",
                    assunto + " · destinatários já avisados por um gatilho mais grave nesta verificação", agora);
        } else {
            String nomes = novos.stream().map(Destinatario::nome).collect(Collectors.joining(", "));
            historico.registrarAlerta(chamado, TipoEvento.NOTIFICACAO, "Alerta de SLA notificado", assunto + " · " + nomes, agora);
        }
    }

    private String descricao(Chamado chamado, GatilhoDeSla gatilho, Prioridade prioridade, OffsetDateTime agora) {
        String base = "Protocolo " + chamado.getCodigo()
                + " · Prioridade " + prioridade
                + " · Prazo: " + gatilho.prazo().rotulo()
                + " · Situação: " + gatilho.limiar().situacao()
                + " · " + gatilho.limiar().consumo();
        return gatilho.limiar() == LimiarDeSla.P1_SEM_PRIMEIRA_RESPOSTA
                ? base + " · Acionamento: " + roteamento.acionamentoDeP1(agora.toInstant())
                : base;
    }
}
