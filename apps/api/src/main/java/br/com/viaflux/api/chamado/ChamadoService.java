package br.com.viaflux.api.chamado;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ChamadoService {

    private static final Set<String> PRIORIDADES = Set.of("Baixa", "Média", "Alta", "Crítica");
    private static final int TAMANHO_MAXIMO_PAGINA = 100;

    private final ChamadoRepository chamadoRepository;
    private final ChamadoEventoRepository chamadoEventoRepository;

    ChamadoService(ChamadoRepository chamadoRepository, ChamadoEventoRepository chamadoEventoRepository) {
        this.chamadoRepository = chamadoRepository;
        this.chamadoEventoRepository = chamadoEventoRepository;
    }

    @Transactional
    ChamadoResponse abrir(AbrirChamadoRequest request) {
        String codigo = String.format(Locale.ROOT, "VF-%04d", chamadoRepository.proximoNumero());
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        Chamado chamado = chamadoRepository.save(new Chamado(codigo, request, agora));
        ChamadoEvento abertura = chamadoEventoRepository.save(new ChamadoEvento(
                chamado,
                "Chamado aberto",
                "Chamado registrado pelo portal ViaFlux.",
                "aberto",
                agora
        ));
        return ChamadoResponse.from(chamado, List.of(TimelineItemResponse.from(abertura)));
    }

    ChamadoResponse consultar(String codigo) {
        return chamadoRepository.findByCodigo(codigo)
                .map(chamado -> ChamadoResponse.from(
                        chamado,
                        chamadoEventoRepository.findByChamadoCodigoOrderByOcorridoEmAscIdAsc(codigo).stream()
                                .map(TimelineItemResponse::from)
                                .toList()
                ))
                .orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
    }

    ChamadosPageResponse listar(String busca, String statusRotulo, String prioridade, int page, int size) {
        if (size > TAMANHO_MAXIMO_PAGINA) {
            throw new FiltroChamadoInvalidoException("O tamanho máximo da página é 100.");
        }

        String buscaNormalizada = normalizarBusca(busca);
        StatusChamado status = statusRotulo == null || statusRotulo.isBlank()
                ? null
                : StatusChamado.fromRotulo(statusRotulo);
        String prioridadeNormalizada = normalizarPrioridade(prioridade);

        Page<Chamado> resultado = chamadoRepository.buscar(
                buscaNormalizada,
                status,
                prioridadeNormalizada,
                PageRequest.of(page, size, Sort.by(
                        Sort.Order.desc("abertoEm"),
                        Sort.Order.desc("codigo")
                ))
        );
        return ChamadosPageResponse.from(resultado);
    }

    private static String normalizar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }

    private static String normalizarBusca(String busca) {
        String valor = normalizar(busca);
        return valor == null ? null : "%" + valor.toLowerCase(Locale.ROOT) + "%";
    }

    private static String normalizarPrioridade(String prioridade) {
        String valor = normalizar(prioridade);
        if (valor == null) {
            return null;
        }
        return PRIORIDADES.stream()
                .filter(opcao -> opcao.equalsIgnoreCase(valor))
                .findFirst()
                .orElseThrow(() -> new FiltroChamadoInvalidoException("A prioridade informada não é válida."));
    }
}
