package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
class AberturaDeChamadoService {

    private static final String MODELO_QUANDO_NAO_HA_VEICULO = "Não se aplica";

    record Resultado(ChamadoResponse chamado, boolean criado) {
    }

    private final ChamadoRepository chamados;
    private final MotivoRepository motivos;
    private final ContextoRepository contextos;
    private final UsuarioRepository usuarios;
    private final PoliticaDeTriagem politicaDeTriagem;
    private final HistoricoDoChamado historico;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    AberturaDeChamadoService(
            ChamadoRepository chamados,
            MotivoRepository motivos,
            ContextoRepository contextos,
            UsuarioRepository usuarios,
            PoliticaDeTriagem politicaDeTriagem,
            HistoricoDoChamado historico,
            MontagemDeChamado montagem,
            Clock relogio
    ) {
        this.chamados = chamados;
        this.motivos = motivos;
        this.contextos = contextos;
        this.usuarios = usuarios;
        this.politicaDeTriagem = politicaDeTriagem;
        this.historico = historico;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    Resultado abrir(AbrirChamadoRequest request, UsuarioAtual usuario, String chaveIdempotencia) {
        String chave = chaveIdempotencia == null || chaveIdempotencia.isBlank() ? null : usuario.id() + ":" + chaveIdempotencia.trim();
        Optional<Chamado> jaRegistrado = chave == null ? Optional.empty() : chamados.findByChaveIdempotencia(chave);
        if (jaRegistrado.isPresent()) {
            return new Resultado(montagem.completo(jaRegistrado.get(), usuario.apenasCliente()), false);
        }

        Motivo motivo = motivos.findById(request.motivoId()).orElse(null);
        Contexto contexto = contextos.findById(request.contextoId()).orElse(null);
        validarClassificacaoDeclarada(motivo, contexto);
        boolean pelaCentral = abrePelaCentral(usuario, request);
        Usuario solicitante = pelaCentral ? solicitanteInformado(request.solicitanteId()) : usuarios.getReferenceById(usuario.id());

        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        int prazoDeTriagem = politicaDeTriagem.prazoEmMinutos(contexto.getUrgencia());
        String modelo = request.modelo() == null || request.modelo().isBlank() ? MODELO_QUANDO_NAO_HA_VEICULO : request.modelo().trim();
        DadosDeAbertura dados = new DadosDeAbertura(
                request.cliente(), request.telefone(), modelo, request.placa(), request.descricao(), request.localizacao(),
                solicitante, motivo, contexto, prazoDeTriagem, chave
        );
        Chamado chamado = chamados.save(new Chamado(proximoCodigo(), dados, agora));

        Autor autor = new Autor(usuario.id(), usuario.nome());
        String detalheDaAbertura = pelaCentral
                ? "Chamado registrado pela Central ViaFlux por " + usuario.nome() + "."
                : "Chamado registrado pelo portal ViaFlux.";
        historico.registrarParaTodos(chamado, TipoEvento.ABERTURA, "Chamado aberto", detalheDaAbertura, autor, agora);
        historico.registrarParaTodos(chamado, TipoEvento.TRIAGEM, "Aguardando triagem",
                "Um atendente vai analisar a solicitação em até " + prazoDeTriagem + " minutos.", Autor.SISTEMA, agora);
        return new Resultado(montagem.completo(chamado, usuario.apenasCliente()), true);
    }

    private static void validarClassificacaoDeclarada(Motivo motivo, Contexto contexto) {
        Map<String, String> erros = new LinkedHashMap<>();
        if (motivo == null) {
            erros.put("motivoId", "Selecione o motivo da solicitação.");
        }
        if (contexto == null) {
            erros.put("contextoId", "Selecione o contexto situacional.");
        } else if (motivo != null && contexto.getTipo() != motivo.getTipo()) {
            erros.put("contextoId", "O contexto não corresponde ao tipo do motivo.");
        }
        if (!erros.isEmpty()) {
            throw ErroDeChamado.camposInvalidos(erros);
        }
    }

    private static boolean abrePelaCentral(UsuarioAtual usuario, AbrirChamadoRequest request) {
        boolean tambemECliente = usuario.temAlgum(UsuarioAtual.PERFIS_DE_CLIENTE);
        return usuario.fazTriagem() && (request.solicitanteId() != null || !tambemECliente);
    }

    private Usuario solicitanteInformado(UUID solicitanteId) {
        if (solicitanteId == null) {
            throw new SolicitanteInvalidoException("Informe o cliente solicitante.");
        }
        return usuarios.findById(solicitanteId)
                .filter(Usuario::isAtivo)
                .filter(usuario -> usuario.getPerfis().stream().anyMatch(perfil -> UsuarioAtual.PERFIS_DE_CLIENTE.contains(perfil.getCodigo())))
                .orElseThrow(() -> new SolicitanteInvalidoException("Selecione um cliente ativo como solicitante."));
    }

    private String proximoCodigo() {
        return String.format(Locale.ROOT, "VF-%04d", chamados.proximoNumero());
    }
}
