package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class ChamadoService {

    private final ChamadoRepository chamadoRepository;

    ChamadoService(ChamadoRepository chamadoRepository) {
        this.chamadoRepository = chamadoRepository;
    }

    ChamadoResponse abrir(AbrirChamadoRequest request) {
        String codigo = "VF-" + chamadoRepository.proximoNumero();
        Chamado chamado = new Chamado(codigo, request, OffsetDateTime.now(ZoneOffset.UTC));
        return ChamadoResponse.from(chamadoRepository.save(chamado));
    }

    ChamadoResponse consultar(String codigo) {
        return chamadoRepository.findByCodigo(codigo)
                .map(ChamadoResponse::from)
                .orElseThrow(() -> new ChamadoNaoEncontradoException(codigo));
    }
}
