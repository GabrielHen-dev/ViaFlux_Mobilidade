package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioRepository;
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
import java.util.UUID;

@Service
public class ChamadoService {

    private static final Set<String> PRIORIDADES = Set.of("Baixa", "Média", "Alta", "Crítica");
    static final Set<String> PERFIS_DE_SOLICITANTE = Set.of("CLIENTE", "GESTOR_FROTA");
    private static final int TAMANHO_MAXIMO_PAGINA = 100;

    private final ChamadoRepository chamadoRepository;
    private final ChamadoEventoRepository chamadoEventoRepository;
    private final UsuarioRepository usuarioRepository;

    ChamadoService(
            ChamadoRepository chamadoRepository,
            ChamadoEventoRepository chamadoEventoRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.chamadoRepository = chamadoRepository;
        this.chamadoEventoRepository = chamadoEventoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    ChamadoResponse abrir(AbrirChamadoRequest request, UUID solicitanteId) {
        Usuario solicitante = solicitanteId == null
                ? null
                : usuarioRepository.findById(solicitanteId).orElseThrow(() ->
                        new IllegalStateException("O usuário autenticado não foi encontrado."));
        return registrar(request, solicitante, "Chamado registrado pelo portal ViaFlux.");
    }

    @Transactional
    ChamadoResponse abrirEmNomeDoCliente(AbrirChamadoRequest request, UUID solicitanteId, UUID atendenteId) {
        Usuario solicitante = usuarioRepository.findById(solicitanteId)
                .filter(Usuario::isAtivo)
                .filter(usuario -> usuario.getPerfis().stream().anyMatch(perfil -> PERFIS_DE_SOLICITANTE.contains(perfil.getCodigo())))
                .orElseThrow(() -> new SolicitanteInvalidoException("Selecione um cliente ativo como solicitante."));
        String atendente = usuarioRepository.findById(atendenteId).map(Usuario::getNome).orElse("Central ViaFlux");
        return registrar(request, solicitante, "Chamado registrado pela Central ViaFlux por " + atendente + ".");
    }

    private ChamadoResponse registrar(AbrirChamadoRequest request, Usuario solicitante, String detalheDaAbertura) {
        String codigo = String.format(Locale.ROOT, "VF-%04d", chamadoRepository.proximoNumero());
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        Chamado chamado = chamadoRepository.save(new Chamado(codigo, request, agora, solicitante));
        ChamadoEvento abertura = chamadoEventoRepository.save(new ChamadoEvento(
                chamado,
                "Chamado aberto",
                detalheDaAbertura,
                "aberto",
                agora
        ));
        return ChamadoResponse.from(chamado, List.of(TimelineItemResponse.from(abertura)));
    }

    ChamadoResponse consultar(String codigo, UUID solicitanteId, boolean acessoGlobal) {
        var chamadoEncontrado = acessoGlobal
                ? chamadoRepository.findByCodigo(codigo)
                : chamadoRepository.findByCodigoAndSolicitante_Id(codigo, solicitanteId);
        return chamadoEncontrado
                .map(chamado -> ChamadoResponse.from(
                        chamado,
                        chamadoEventoRepository.findByChamadoCodigoOrderByOcorridoEmAscIdAsc(codigo).stream()
                                .map(TimelineItemResponse::from)
                                .toList()
                ))
                .orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
    }

    ChamadosResumoResponse resumir() {
        return new ChamadosResumoResponse(
                chamadoRepository.count(),
                chamadoRepository.countByPrioridade("Crítica"),
                chamadoRepository.countByStatus(StatusChamado.EM_ATENDIMENTO),
                chamadoRepository.countByStatus(StatusChamado.AGUARDANDO)
        );
    }

    ChamadosPageResponse listar(
            String busca,
            String statusRotulo,
            String prioridade,
            int page,
            int size,
            UUID solicitanteId,
            boolean acessoGlobal
    ) {
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
                solicitanteId,
                acessoGlobal,
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
