package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;

    ChamadoService(ChamadoRepository chamadoRepository) {
        this.chamadoRepository = chamadoRepository;
    }

    ChamadoResponse abrir(AbrirChamadoRequest request) {
        Chamado chamado = new Chamado(request.solicitante(), OffsetDateTime.now(ZoneOffset.UTC));
        return ChamadoResponse.from(chamadoRepository.save(chamado));
    }

    ChamadoResponse consultar(UUID id) {
        return chamadoRepository.findById(id)
                .map(ChamadoResponse::from)
                .orElseThrow(() -> new ChamadoNaoEncontradoException(id));
    }
}
