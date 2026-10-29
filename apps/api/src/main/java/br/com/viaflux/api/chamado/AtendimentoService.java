package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

@Service
class AtendimentoService {

    private final AcessoAosChamados acesso;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    AtendimentoService(AcessoAosChamados acesso, HistoricoDoChamado historico, AvisoAoSolicitante aviso, MontagemDeChamado montagem, Clock relogio) {
        this.acesso = acesso;
        this.historico = historico;
        this.aviso = aviso;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional
    ChamadoResponse alterarStatus(String codigo, AlterarStatusRequest request, UsuarioAtual usuario) {
        StatusChamado novo = statusValido(request.status());
        MotivoAguardando motivo = motivoAguardandoValido(request.motivoAguardando());
        Chamado chamado = acesso.paraAtender(codigo, usuario);
        OffsetDateTime agora = agora();
        if (novo == StatusChamado.RESOLVIDO && (request.resumoResolucao() == null || request.resumoResolucao().isBlank())) {
            throw ErroDeChamado.campoInvalido("resumoResolucao", "Informe o resumo da solução antes de resolver o chamado.");
        }
        StatusChamado anterior = chamado.alterarStatus(novo, motivo, agora);
        if (novo == StatusChamado.RESOLVIDO) chamado.resolverComResumo(request.resumoResolucao(), autor(usuario), agora);
        if (novo == StatusChamado.EM_ATENDIMENTO) {
            chamado.registrarResponsavelSeAusente(autor(usuario), agora);
        }

        StringBuilder detalhe = new StringBuilder(anterior.getRotulo()).append(" → ").append(novo.getRotulo());
        if (chamado.getMotivoAguardando() != null) {
            detalhe.append(" · aguardando ").append(chamado.getMotivoAguardando().getRotulo());
        }
        if (chamado.getMotivoAguardando() == MotivoAguardando.CLIENTE) {
            detalhe.append(" · relógio de resolução pausado");
        }
        if (request.observacao() != null && !request.observacao().isBlank()) {
            detalhe.append(" · ").append(request.observacao().trim());
        }
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Status alterado para " + novo.getRotulo(), detalhe.toString(), autor(usuario), agora);
        aviso.avisar(chamado, novo.getRotulo(), "O chamado " + chamado.getCodigo() + " mudou para " + novo.getRotulo() + ".", agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse assumir(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraAtender(codigo, usuario);
        OffsetDateTime agora = agora();
        Autor responsavel = autor(usuario);
        StatusChamado statusAnterior = chamado.getStatus();
        Autor responsavelAnterior = chamado.getAtendimentoResponsavel();
        chamado.assumirAtendimento(responsavel, agora);
        if (statusAnterior != StatusChamado.EM_ATENDIMENTO) {
            String novo = StatusChamado.EM_ATENDIMENTO.getRotulo();
            historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Status alterado para " + novo,
                    statusAnterior.getRotulo() + " → " + novo + " · assumido por " + responsavel.nome(), responsavel, agora);
            aviso.avisar(chamado, novo, "O chamado " + chamado.getCodigo() + " mudou para " + novo + ".", agora);
        } else {
            historico.registrarInterno(chamado, TipoEvento.STATUS, "Responsável alterado",
                    (responsavelAnterior == null ? "Sem responsável" : responsavelAnterior.nome()) + " → " + responsavel.nome(), responsavel, agora);
        }
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse transferir(String codigo, TransferenciaRequest request, UsuarioAtual usuario) {
        TipoChamado destino = TipoChamado.deCodigo(request.departamento(), "departamento");
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        OffsetDateTime agora = agora();
        TipoChamado origem = chamado.transferir(destino, agora);
        historico.registrarInterno(chamado, TipoEvento.TRANSFERENCIA, "Chamado transferido",
                origem.getNome() + " → " + destino.getNome() + " · Motivo: " + request.motivo().trim(), autor(usuario), agora);
        historico.registrarParaTodos(chamado, TipoEvento.ROTEAMENTO, "Encaminhado para " + destino.getNome(),
                "O chamado entrou na fila de " + destino.getNome() + ".", Autor.SISTEMA, agora);
        return montagem.completo(chamado, false);
    }

    @Transactional
    ChamadoResponse registrarAtualizacao(String codigo, AtualizacaoRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        boolean doSolicitante = usuario.apenasCliente();
        if (!doSolicitante && !acesso.podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Este chamado não está na fila do seu departamento.");
        }
        OffsetDateTime agora = agora();
        boolean visivelCliente = doSolicitante || request.visivelCliente();
        String acao = doSolicitante ? "Complemento do solicitante" : visivelCliente ? "Mensagem ao solicitante" : "Registro interno";
        historico.registrar(chamado, TipoEvento.ATUALIZACAO, acao, request.texto().trim(), autor(usuario), visivelCliente, agora);
        if (!doSolicitante && visivelCliente) {
            chamado.registrarPrimeiraResposta(agora);
        }
        return montagem.completo(chamado, doSolicitante);
    }

    @Transactional
    ChamadoResponse registrarLocalizacao(String codigo, DadosDeLocalizacao dados, UsuarioAtual usuario) {
        if (dados == null || dados.vazia()) {
            throw ErroDeChamado.campoInvalido("endereco", "Informe um endereço ou use a localização do aparelho.");
        }
        Chamado chamado = acesso.visivel(codigo, usuario);
        if (!usuario.apenasCliente() && !acesso.podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Seu perfil só acompanha este chamado.");
        }
        OffsetDateTime agora = agora();
        chamado.atualizarLocalizacao(dados, agora);
        historico.registrarParaTodos(chamado, TipoEvento.LOCALIZACAO, "Localização registrada",
                chamado.getLocalizacao().getEndereco() + " · " + chamado.getLocalizacao().origem(), autor(usuario), agora);
        return montagem.completo(chamado, usuario.apenasCliente());
    }

    private static StatusChamado statusValido(String rotulo) {
        try {
            return StatusChamado.fromRotulo(rotulo);
        } catch (FiltroChamadoInvalidoException erro) {
            throw ErroDeChamado.campoInvalido("status", "Status inválido.");
        }
    }

    private static MotivoAguardando motivoAguardandoValido(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return MotivoAguardando.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw ErroDeChamado.campoInvalido("motivoAguardando", "Informe quem está sendo aguardado: cliente, fornecedor ou outro departamento.");
        }
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static Autor autor(UsuarioAtual usuario) {
        return new Autor(usuario.id(), usuario.nome());
    }
}
