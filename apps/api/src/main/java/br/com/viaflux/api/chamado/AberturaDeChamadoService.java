package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import br.com.viaflux.api.usuario.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
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

    static final String EMAIL_NAO_VERIFICADO = "Confirme seu e-mail pelo link que enviamos antes de abrir o primeiro chamado.";

    private static final String MODELO_QUANDO_NAO_HA_VEICULO = "Não se aplica";

    record Resultado(ChamadoResponse chamado, boolean criado) {
    }

    private final ChamadoRepository chamados;
    private final MotivoRepository motivos;
    private final ContextoRepository contextos;
    private final UsuarioRepository usuarios;
    private final PoliticaDeTriagem politicaDeTriagem;
    private final RegraDeRoteamento roteamento;
    private final HistoricoDoChamado historico;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    @Autowired
    AberturaDeChamadoService(
            ChamadoRepository chamados,
            MotivoRepository motivos,
            ContextoRepository contextos,
            UsuarioRepository usuarios,
            PoliticaDeTriagem politicaDeTriagem,
            RegraDeRoteamento roteamento,
            HistoricoDoChamado historico,
            MontagemDeChamado montagem,
            Clock relogio
    ) {
        this.chamados = chamados;
        this.motivos = motivos;
        this.contextos = contextos;
        this.usuarios = usuarios;
        this.politicaDeTriagem = politicaDeTriagem;
        this.roteamento = roteamento;
        this.historico = historico;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    AberturaDeChamadoService(ChamadoRepository chamados, MotivoRepository motivos, ContextoRepository contextos,
                             UsuarioRepository usuarios, PoliticaDeTriagem politicaDeTriagem, HistoricoDoChamado historico,
                             MontagemDeChamado montagem, Clock relogio) {
        this(chamados, motivos, contextos, usuarios, politicaDeTriagem, (tipo, prioridade, instante) -> tipo,
                historico, montagem, relogio);
    }

    @Transactional
    Resultado abrir(AbrirChamadoRequest request, UsuarioAtual usuario, String chaveIdempotencia) {
        if (!usuario.emailVerificado()) {
            throw ErroDeChamado.proibido(EMAIL_NAO_VERIFICADO);
        }
        String chave = chaveIdempotencia == null || chaveIdempotencia.isBlank() ? null : usuario.id() + ":" + chaveIdempotencia.trim();
        Optional<Chamado> jaRegistrado = chave == null ? Optional.empty() : chamados.findByChaveIdempotencia(chave);
        if (jaRegistrado.isPresent()) {
            return new Resultado(montagem.completo(jaRegistrado.get(), usuario.apenasCliente()), false);
        }

        boolean outro = request.motivoId() != null && request.motivoId().equalsIgnoreCase("OUTRO");
        Motivo motivo = outro ? null : motivos.findById(request.motivoId()).orElse(null);
        Contexto contexto = request.contextoId() == null || request.contextoId().isBlank()
                ? null : contextos.findById(request.contextoId()).orElse(null);
        validarClassificacaoDeclarada(motivo, contexto, outro, request.motivoOutro(), usuario);
        boolean pelaCentral = abrePelaCentral(usuario, request);
        Usuario solicitante = pelaCentral ? solicitanteInformado(request.solicitanteId(), usuario) : usuarios.getReferenceById(usuario.id());

        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        int prazoDeTriagem = politicaDeTriagem.prazoEmMinutos(contexto == null ? 1 : contexto.getUrgencia());
        String modelo = request.modelo() == null || request.modelo().isBlank() ? MODELO_QUANDO_NAO_HA_VEICULO : request.modelo().trim();
        String nomeSolicitante = solicitante == null ? request.cliente() : solicitante.getNome();
        DadosDeAbertura dados = new DadosDeAbertura(
                nomeSolicitante, request.telefone(), modelo, request.placa(), request.descricao(), request.localizacao(),
                solicitante, motivo, contexto, outro ? request.motivoOutro().trim() : null,
                usuario.id(), usuario.nome(), prazoDeTriagem, chave
        );
        Chamado chamado = chamados.save(new Chamado(proximoCodigo(), dados, agora));

        Autor autor = new Autor(usuario.id(), usuario.nome());
        String detalheDaAbertura = pelaCentral
                ? (usuario.perfis().contains("GESTOR_FROTA") && !usuario.fazTriagem()
                    ? "Chamado registrado pelo gestor de frota " + usuario.nome() + " para " + solicitante.getNome() + "."
                    : "Chamado registrado pela Central ViaFlux por " + usuario.nome() + ".")
                : "Chamado registrado pelo portal ViaFlux.";
        historico.registrarParaTodos(chamado, TipoEvento.ABERTURA, "Chamado aberto", detalheDaAbertura, autor, agora);
        if (outro) {
            historico.registrarInterno(chamado, TipoEvento.TRIAGEM, "Exceção de classificação — revisão da Central",
                    "Motivo informado: " + request.motivoOutro().trim(), autor, agora);
        } else {
            int severidade = motivo.getSeveridade();
            int urgencia = contexto.getUrgencia();
            Prioridade prioridade = Prioridade.porScore(Prioridade.score(severidade, urgencia));
            TipoChamado destino;
            try {
                destino = roteamento.destino(motivo.getTipo(), prioridade, urgencia, agora.toInstant());
            } catch (RuntimeException falhaRoteamento) {
                chamado.marcarPendenteRoteamento(agora);
                historico.registrarInterno(chamado, TipoEvento.ROTEAMENTO, "Pendente de roteamento — fila de exceções",
                        "O protocolo foi persistido; o roteamento automático falhou e requer intervenção da Central.", Autor.SISTEMA, agora);
                return new Resultado(montagem.completo(chamado, usuario.apenasCliente()), true);
            }
            chamado.classificarAutomaticamente(motivo.getTipo(), severidade, urgencia, destino, agora);
            historico.registrarInterno(chamado, TipoEvento.CLASSIFICACAO, "Classificação automática V1",
                    TriagemService.descreverClassificacao(motivo.getTipo(), severidade, urgencia), Autor.SISTEMA, agora);
            historico.registrarParaTodos(chamado, TipoEvento.ROTEAMENTO, "Encaminhado para " + destino.getNome(),
                    "Classificação e destino aplicados automaticamente conforme regras V1.", Autor.SISTEMA, agora);
        }
        return new Resultado(montagem.completo(chamado, usuario.apenasCliente()), true);
    }

    private static void validarClassificacaoDeclarada(Motivo motivo, Contexto contexto, boolean outro, String motivoOutro, UsuarioAtual usuario) {
        Map<String, String> erros = new LinkedHashMap<>();
        if (outro) {
            if (motivoOutro == null || motivoOutro.isBlank()) erros.put("motivoOutro", "Descreva brevemente o motivo para a Central classificar.");
            if (contexto != null) erros.put("contextoId", "Outro motivo não recebe contexto ou prioridade antes da classificação da Central.");
        } else if (motivo == null) {
            erros.put("motivoId", "Selecione o motivo da solicitação.");
        } else if (usuario.temAlgum(UsuarioAtual.PERFIS_DE_CLIENTE) && !usuario.fazTriagem() && motivo.getTipo() == TipoChamado.TI) {
            erros.put("motivoId", "Solicitações internas de Tecnologia devem ser abertas pela equipe autorizada da unidade.");
        }
        if (!outro && contexto == null) {
            erros.put("contextoId", "Selecione o contexto situacional.");
        } else if (!outro && motivo != null && contexto.getTipo() != motivo.getTipo()) {
            erros.put("contextoId", "O contexto não corresponde ao tipo do motivo.");
        }
        if (!erros.isEmpty()) {
            throw ErroDeChamado.camposInvalidos(erros);
        }
    }

    private static boolean abrePelaCentral(UsuarioAtual usuario, AbrirChamadoRequest request) {
        boolean tambemECliente = usuario.temAlgum(UsuarioAtual.PERFIS_DE_CLIENTE);
        return (usuario.fazTriagem() && (request.solicitanteId() != null || !tambemECliente))
                || (usuario.perfis().contains("GESTOR_FROTA") && request.solicitanteId() != null);
    }

    private Usuario solicitanteInformado(UUID solicitanteId, UsuarioAtual atual) {
        if (solicitanteId == null) {
            throw new SolicitanteInvalidoException("Informe o cliente solicitante.");
        }
        Usuario solicitante = usuarios.findById(solicitanteId)
                .filter(Usuario::isAtivo)
                .filter(usuario -> usuario.getPerfis().stream().anyMatch(perfil -> UsuarioAtual.PERFIS_DE_CLIENTE.contains(perfil.getCodigo())))
                .orElseThrow(() -> new SolicitanteInvalidoException("Selecione um cliente ativo como solicitante."));
        if (atual.perfis().contains("GESTOR_FROTA") && !atual.fazTriagem()
                && (atual.organizacaoId() == null || solicitante.getOrganizacao() == null
                || !atual.organizacaoId().equals(solicitante.getOrganizacao().getId()))) {
            throw new SolicitanteInvalidoException("O solicitante deve pertencer à sua organização.");
        }
        return solicitante;
    }

    private String proximoCodigo() {
        return String.format(Locale.ROOT, "VF-%04d", chamados.proximoNumero());
    }
}
