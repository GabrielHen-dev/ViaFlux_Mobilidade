package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
class ColetaDeMetricas {

    private final ChamadoRepository chamados;
    private final ChamadoEventoRepository eventos;
    private final ServicoTerceiroRepository servicos;
    private final MontagemDeChamado montagem;

    ColetaDeMetricas(ChamadoRepository chamados, ChamadoEventoRepository eventos, ServicoTerceiroRepository servicos, MontagemDeChamado montagem) {
        this.chamados = chamados;
        this.eventos = eventos;
        this.servicos = servicos;
        this.montagem = montagem;
    }

    List<LinhaDeMetrica> coletar(FiltrosDeMetricas filtros) {
        List<Chamado> doPeriodo = chamados.buscarAtivos(null).stream()
                .filter(chamado -> dentroDoPeriodo(chamado, filtros.de(), filtros.ate()))
                .filter(chamado -> filtros.prioridade() == null || chamado.prioridadeEfetiva() == filtros.prioridade())
                .filter(chamado -> filtros.tipo() == null || chamado.tipoVigente() == filtros.tipo())
                .filter(chamado -> filtros.departamento() == null || chamado.getDepartamento() == filtros.departamento())
                .toList();
        List<UUID> ids = doPeriodo.stream().map(Chamado::getId).toList();
        Map<UUID, Set<TipoEvento>> marcas = eventos.findByChamadoIdInAndTipoIn(ids, Set.of(TipoEvento.RECLASSIFICACAO, TipoEvento.OVERRIDE)).stream()
                .collect(Collectors.groupingBy(evento -> evento.getChamado().getId(), Collectors.mapping(ChamadoEvento::getTipo, Collectors.toSet())));
        Map<UUID, ServicoTerceiro> servicoPorChamado = servicos.findByChamadoIdInAndCanceladoFalse(ids).stream()
                .collect(Collectors.toMap(servico -> servico.getChamado().getId(), Function.identity(),
                        (primeiro, segundo) -> Comparator.comparing(ServicoTerceiro::getAtualizadoEm).compare(primeiro, segundo) >= 0 ? primeiro : segundo));
        return doPeriodo.stream()
                .map(chamado -> new LinhaDeMetrica(
                        chamado,
                        montagem.resumo(chamado),
                        marcas.getOrDefault(chamado.getId(), Set.of()).contains(TipoEvento.RECLASSIFICACAO),
                        marcas.getOrDefault(chamado.getId(), Set.of()).contains(TipoEvento.OVERRIDE),
                        Optional.ofNullable(servicoPorChamado.get(chamado.getId()))
                ))
                .filter(linha -> filtros.fornecedor() == null
                        || linha.servico().map(servico -> servico.getFornecedor().getId().equals(filtros.fornecedor())).orElse(false))
                .toList();
    }

    private static boolean dentroDoPeriodo(Chamado chamado, LocalDate de, LocalDate ate) {
        LocalDate dia = Datas.local(chamado.getAbertoEm()).toLocalDate();
        return !dia.isBefore(de) && !dia.isAfter(ate);
    }
}
