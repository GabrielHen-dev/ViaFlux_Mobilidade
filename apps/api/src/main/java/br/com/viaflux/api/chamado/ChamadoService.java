package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Service
public class ChamadoService {

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
}
