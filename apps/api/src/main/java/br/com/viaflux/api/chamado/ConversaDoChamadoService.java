package br.com.viaflux.api.chamado;


import br.com.viaflux.api.chamado.anexo.AnexoResponse;
import br.com.viaflux.api.chamado.anexo.ChamadoAnexo;
import br.com.viaflux.api.chamado.anexo.ChamadoAnexoRepository;
import br.com.viaflux.api.chamado.anexo.VisibilidadeDoConteudo;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ConversaDoChamadoService {

    private final AcessoAosChamados acesso;
    private final ChamadoEventoRepository eventos;
    private final ChamadoAnexoRepository anexos;
    private final LeituraDaConversaRepository leituras;
    private final CanalDeMensagensDoChat canal;
    private final AvisosDaConversa avisos;
    private final Clock relogio;

    public ConversaDoChamadoService(AcessoAosChamados acesso, ChamadoEventoRepository eventos, ChamadoAnexoRepository anexos,
                             LeituraDaConversaRepository leituras, CanalDeMensagensDoChat canal, AvisosDaConversa avisos, Clock relogio) {
        this.acesso = acesso;
        this.eventos = eventos;
        this.anexos = anexos;
        this.leituras = leituras;
        this.canal = canal;
        this.avisos = avisos;
        this.relogio = relogio;
    }

    @Transactional(readOnly = true)
    public ConversaResponse consultar(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        boolean visaoDeCliente = usuario.apenasCliente();
        List<ChamadoEvento> mensagens = eventos.findByChamadoIdAndTipoOrderByOcorridoEmAscSequenciaAsc(chamado.getId(), TipoEvento.ATUALIZACAO).stream()
                .filter(evento -> !visaoDeCliente || evento.isVisivelCliente())
                .toList();
        Map<UUID, AnexoResponse> anexosCitados = anexosCitados(chamado, mensagens, visaoDeCliente);
        OffsetDateTime lidoAte = leituras.findByChamadoIdAndUsuarioId(chamado.getId(), usuario.id())
                .map(LeituraDaConversa::getLidoAte)
                .map(Datas::local)
                .orElse(null);
        return new ConversaResponse(
                mensagens.stream().map(evento -> MensagemResponse.de(evento, anexoDa(evento, anexosCitados))).toList(),
                lidoAte
        );
    }

    @Transactional
    public void marcarComoLida(String codigo, OffsetDateTime ate, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        OffsetDateTime lidoAte = ate.isAfter(agora) ? agora : ate;
        leituras.avancar(chamado.getId(), usuario.id(), lidoAte);
        canal.marcarMensagensComoLidas(usuario.id(), chamado.getId(), lidoAte);
        if (!usuario.apenasCliente() && acesso.podeConduzir(chamado, usuario)) {
            avisos.equipeTratouAConversa(chamado);
        }
    }

    private static AnexoResponse anexoDa(ChamadoEvento mensagem, Map<UUID, AnexoResponse> anexosCitados) {
        return mensagem.getAnexoId() == null ? null : anexosCitados.get(mensagem.getAnexoId());
    }

    private Map<UUID, AnexoResponse> anexosCitados(Chamado chamado, List<ChamadoEvento> mensagens, boolean visaoDeCliente) {
        if (mensagens.stream().map(ChamadoEvento::getAnexoId).allMatch(Objects::isNull)) {
            return Map.of();
        }
        return anexos.findByChamadoIdOrderByEnviadoEmAsc(chamado.getId()).stream()
                .filter(anexo -> !visaoDeCliente || anexo.getVisibilidade() == VisibilidadeDoConteudo.SOLICITANTE)
                .collect(Collectors.toMap(ChamadoAnexo::getId, AnexoResponse::de));
    }
}
