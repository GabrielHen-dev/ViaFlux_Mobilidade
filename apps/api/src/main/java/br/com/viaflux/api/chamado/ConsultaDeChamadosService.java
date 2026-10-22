package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.SituacaoPrazo;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.stream.Stream;

@Service
class ConsultaDeChamadosService {

    private static final int TAMANHO_MAXIMO_DA_PAGINA = 100;
    private static final Comparator<ChamadoResumoResponse> MAIS_RECENTES = Comparator
            .comparing(ChamadoResumoResponse::abertura).reversed()
            .thenComparing(ChamadoResumoResponse::id, Comparator.reverseOrder());
    private static final Comparator<ChamadoResumoResponse> ORDEM_DA_FILA = Comparator
            .comparing(ChamadoResumoResponse::prioridade, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(ChamadoResumoResponse::score, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(ChamadoResumoResponse::abertura);

    private final AcessoAosChamados acesso;
    private final MontagemDeChamado montagem;

    ConsultaDeChamadosService(AcessoAosChamados acesso, MontagemDeChamado montagem) {
        this.acesso = acesso;
        this.montagem = montagem;
    }

    @Transactional(readOnly = true)
    ChamadosPageResponse listar(FiltrosDeChamados filtros, int page, int size, UsuarioAtual usuario) {
        if (size > TAMANHO_MAXIMO_DA_PAGINA) {
            throw new FiltroChamadoInvalidoException("O tamanho máximo da página é 100.");
        }
        Comparator<ChamadoResumoResponse> ordem = filtros.ordenacao() == FiltrosDeChamados.Ordenacao.RECENTES ? MAIS_RECENTES : ORDEM_DA_FILA;
        List<ChamadoResumoResponse> filtrados = resumosVisiveis(filtros, usuario)
                .filter(chamado -> filtros.status() != null || filaAtiva(chamado.status()))
                .filter(chamado -> filtros.status() != null || filtros.etapa() != null || chamado.prioridade() != null)
                .sorted(ordem)
                .toList();
        return ChamadosPageResponse.de(filtrados, page, size);
    }

    private static boolean filaAtiva(String status) {
        return !StatusChamado.RESOLVIDO.getRotulo().equals(status)
                && !StatusChamado.FECHADO.getRotulo().equals(status);
    }

    @Transactional(readOnly = true)
    ResumoDeChamadosResponse resumir(FiltrosDeChamados filtros, UsuarioAtual usuario) {
        List<ChamadoResumoResponse> chamados = resumosVisiveis(filtros.semStatus(), usuario).toList();
        List<ChamadoResumoResponse> ativosTriados = chamados.stream()
                .filter(chamado -> chamado.sla() != null && filaAtiva(chamado.status()))
                .toList();
        List<ChamadoResumoResponse> emTriagem = chamados.stream().filter(chamado -> chamado.prioridade() == null).toList();
        return new ResumoDeChamadosResponse(
                chamados.size(),
                contarPorStatus(chamados),
                contarPorPrioridade(chamados),
                contarPorDepartamento(chamados),
                new ResumoDeChamadosResponse.Sla(
                        contadores(ativosTriados.stream().map(chamado -> chamado.sla().primeiraResposta().situacao())),
                        contadores(ativosTriados.stream().map(chamado -> chamado.sla().resolucao().situacao()))
                ),
                ativosTriados.stream()
                        .filter(chamado -> chamado.prioridade() == Prioridade.P1 && chamado.sla().primeiraResposta().cumpridoEm() == null)
                        .map(ChamadoResumoResponse::id)
                        .toList(),
                resumoDaTriagem(emTriagem)
        );
    }

    @Transactional(readOnly = true)
    ChamadoResponse consultar(String codigo, UsuarioAtual usuario) {
        return montagem.completo(acesso.visivel(codigo, usuario), usuario.apenasCliente());
    }

    private Stream<ChamadoResumoResponse> resumosVisiveis(FiltrosDeChamados filtros, UsuarioAtual usuario) {
        return acesso.visiveis(usuario, filtros.busca()).stream()
                .filter(porEtapa(filtros.etapa()))
                .filter(chamado -> filtros.status() == null || chamado.getStatus() == filtros.status())
                .filter(chamado -> filtros.departamento() == null || chamado.getDepartamento() == filtros.departamento())
                .filter(chamado -> filtros.tipo() == null || chamado.tipoVigente() == filtros.tipo())
                .filter(chamado -> filtros.prioridade() == null || chamado.prioridadeEfetiva() == filtros.prioridade())
                .map(montagem::resumo)
                .filter(porSla(filtros.sla()));
    }

    private static Predicate<Chamado> porEtapa(FiltrosDeChamados.Etapa etapa) {
        if (etapa == null) {
            return chamado -> true;
        }
        return etapa == FiltrosDeChamados.Etapa.TRIAGEM ? chamado -> !chamado.triado() : Chamado::triado;
    }

    private static Predicate<ChamadoResumoResponse> porSla(SituacaoPrazo situacao) {
        if (situacao == null) {
            return resumo -> true;
        }
        return resumo -> {
            if (resumo.sla() == null) {
                return false;
            }
            List<SituacaoPrazo> situacoes = List.of(resumo.sla().primeiraResposta().situacao(), resumo.sla().resolucao().situacao());
            if (situacao == SituacaoPrazo.NO_PRAZO) {
                return situacoes.stream().noneMatch(atual -> atual == SituacaoPrazo.EM_RISCO || atual == SituacaoPrazo.VIOLADO);
            }
            return situacoes.contains(situacao);
        };
    }

    private static Map<String, Long> contarPorStatus(List<ChamadoResumoResponse> chamados) {
        Map<String, Long> contagem = new LinkedHashMap<>();
        Arrays.stream(StatusChamado.values()).forEach(status -> contagem.put(status.getRotulo(), 0L));
        chamados.forEach(chamado -> contagem.merge(chamado.status(), 1L, Long::sum));
        return contagem;
    }

    private static Map<Prioridade, Long> contarPorPrioridade(List<ChamadoResumoResponse> chamados) {
        Map<Prioridade, Long> contagem = new EnumMap<>(Prioridade.class);
        Arrays.stream(Prioridade.values()).forEach(prioridade -> contagem.put(prioridade, 0L));
        chamados.stream().map(ChamadoResumoResponse::prioridade).filter(Objects::nonNull)
                .forEach(prioridade -> contagem.merge(prioridade, 1L, Long::sum));
        return contagem;
    }

    private static Map<TipoChamado, Long> contarPorDepartamento(List<ChamadoResumoResponse> chamados) {
        Map<TipoChamado, Long> contagem = new EnumMap<>(TipoChamado.class);
        Arrays.stream(TipoChamado.values()).forEach(tipo -> contagem.put(tipo, 0L));
        chamados.stream().map(ChamadoResumoResponse::departamento).filter(Objects::nonNull)
                .forEach(departamento -> contagem.merge(departamento.codigo(), 1L, Long::sum));
        return contagem;
    }

    private static ResumoDeChamadosResponse.Contadores contadores(Stream<SituacaoPrazo> situacoes) {
        List<SituacaoPrazo> lista = situacoes.toList();
        return new ResumoDeChamadosResponse.Contadores(
                lista.stream().filter(situacao -> situacao == SituacaoPrazo.NO_PRAZO || situacao == SituacaoPrazo.CUMPRIDO).count(),
                lista.stream().filter(situacao -> situacao == SituacaoPrazo.EM_RISCO).count(),
                lista.stream().filter(situacao -> situacao == SituacaoPrazo.VIOLADO || situacao == SituacaoPrazo.CUMPRIDO_COM_ATRASO).count()
        );
    }

    private static ResumoDeChamadosResponse.Triagem resumoDaTriagem(List<ChamadoResumoResponse> emTriagem) {
        OffsetDateTime proximoLimite = emTriagem.stream()
                .map(chamado -> chamado.triagem().limite())
                .min(Comparator.naturalOrder())
                .orElse(null);
        return new ResumoDeChamadosResponse.Triagem(
                emTriagem.stream().filter(chamado -> StatusChamado.ABERTO.getRotulo().equals(chamado.status())).count(),
                emTriagem.stream().filter(chamado -> StatusChamado.EM_TRIAGEM.getRotulo().equals(chamado.status())).count(),
                emTriagem.stream().filter(chamado -> chamado.triagem().situacao() == SituacaoPrazo.EM_RISCO).count(),
                emTriagem.stream().filter(chamado -> chamado.triagem().situacao() == SituacaoPrazo.VIOLADO).count(),
                proximoLimite
        );
    }
}
