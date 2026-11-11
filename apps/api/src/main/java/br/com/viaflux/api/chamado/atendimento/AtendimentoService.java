package br.com.viaflux.api.chamado.atendimento;


import br.com.viaflux.api.chamado.AcessoAosChamados;
import br.com.viaflux.api.chamado.Autor;
import br.com.viaflux.api.chamado.AvisoAoSolicitante;
import br.com.viaflux.api.chamado.AvisosDaConversa;
import br.com.viaflux.api.chamado.Chamado;
import br.com.viaflux.api.chamado.ChamadoResponse;
import br.com.viaflux.api.chamado.DadosDeLocalizacao;
import br.com.viaflux.api.chamado.ErroDeChamado;
import br.com.viaflux.api.chamado.FiltroChamadoInvalidoException;
import br.com.viaflux.api.chamado.HistoricoDoChamado;
import br.com.viaflux.api.chamado.MontagemDeChamado;
import br.com.viaflux.api.chamado.MotivoAguardando;
import br.com.viaflux.api.chamado.OrigemDaMensagem;
import br.com.viaflux.api.chamado.StatusChamado;
import br.com.viaflux.api.chamado.TipoChamado;
import br.com.viaflux.api.chamado.TipoEvento;
import br.com.viaflux.api.chamado.anexo.AnexoResponse;
import br.com.viaflux.api.chamado.anexo.AnexoService;
import br.com.viaflux.api.chamado.anexo.VisibilidadeDoConteudo;
import br.com.viaflux.api.chamado.classificacao.Motivo;
import br.com.viaflux.api.shared.seguranca.LimiteDeTentativas;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Service
public class AtendimentoService{

    private static final int MENSAGENS_POR_MINUTO = 30;
    private static final int TAMANHO_MAXIMO_DA_MENSAGEM = 5000;
    private static final String ACAO_DO_SOLICITANTE = "Complemento do solicitante";
    private static final String ACAO_MENSAGEM_DA_EQUIPE = "Mensagem ao solicitante";
    private static final String ACAO_NOTA_INTERNA = "Registro interno";
    private static final String ACAO_MENSAGEM_AO_FORNECEDOR = "Mensagem ao fornecedor";
    private static final List<String> DESTINOS = List.of(
            AtualizacaoRequest.DESTINO_SOLICITANTE, AtualizacaoRequest.DESTINO_INTERNO, AtualizacaoRequest.DESTINO_FORNECEDOR);

    private final AcessoAosChamados acesso;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final AvisosDaConversa avisosDaConversa;
    private final AnexoService anexos;
    private final MontagemDeChamado montagem;
    private final Clock relogio;
    private final LimiteDeTentativas limiteDeMensagens;

    public AtendimentoService(AcessoAosChamados acesso, HistoricoDoChamado historico, AvisoAoSolicitante aviso, AvisosDaConversa avisosDaConversa,
                       AnexoService anexos, MontagemDeChamado montagem, Clock relogio) {
        this.acesso = acesso;
        this.historico = historico;
        this.aviso = aviso;
        this.avisosDaConversa = avisosDaConversa;
        this.anexos = anexos;
        this.montagem = montagem;
        this.relogio = relogio;
        this.limiteDeMensagens = new LimiteDeTentativas(MENSAGENS_POR_MINUTO, Duration.ofMinutes(1), relogio);
    }

    @Transactional
    public ChamadoResponse alterarStatus(String codigo, AlterarStatusRequest request, UsuarioAtual usuario) {
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
    public ChamadoResponse assumir(String codigo, UsuarioAtual usuario) {
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
    public ChamadoResponse transferir(String codigo, TransferenciaRequest request, UsuarioAtual usuario) {
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
    public ChamadoResponse registrarAtualizacao(String codigo, AtualizacaoRequest request, UsuarioAtual usuario) {
        String destino = destinoValido(request.destino());
        Chamado chamado = chamadoParaAConversa(codigo, usuario);
        if (!usuario.apenasCliente() && AtualizacaoRequest.DESTINO_FORNECEDOR.equals(destino)) {
            if (!montagem.temFornecedorAtivo(chamado)) {
                throw ErroDeChamado.conflito("Acione um fornecedor antes de enviar uma mensagem a ele.");
            }
            historico.registrarMensagemAoFornecedor(chamado, ACAO_MENSAGEM_AO_FORNECEDOR, request.texto().trim(), autor(usuario), agora());
            return montagem.completo(chamado, false);
        }
        boolean publica = destino == null ? request.visivelCliente() : AtualizacaoRequest.DESTINO_SOLICITANTE.equals(destino);
        publicarMensagem(chamado, request.texto().trim(), usuario.apenasCliente() || publica, null, usuario);
        return montagem.completo(chamado, usuario.apenasCliente());
    }

    @Transactional
    public ChamadoResponse enviarArquivoNaConversa(String codigo, MultipartFile arquivo, String texto, boolean visivelCliente, String chaveIdempotencia, UsuarioAtual usuario) {
        String textoInformado = texto == null ? "" : texto.trim();
        if (textoInformado.length() > TAMANHO_MAXIMO_DA_MENSAGEM) {
            throw ErroDeChamado.campoInvalido("texto", "A atualização deve ter no máximo " + TAMANHO_MAXIMO_DA_MENSAGEM + " caracteres.");
        }
        Chamado chamado = chamadoParaAConversa(codigo, usuario);
        boolean publica = usuario.apenasCliente() || visivelCliente;
        VisibilidadeDoConteudo visibilidade = publica ? VisibilidadeDoConteudo.SOLICITANTE : VisibilidadeDoConteudo.INTERNO;
        AnexoService.Resultado resultado = anexos.enviar(codigo, arquivo, chaveIdempotencia, visibilidade, usuario);
        if (resultado.criado()) {
            String conteudo = textoInformado.isEmpty() ? "Arquivo enviado: " + resultado.anexo().nome() : textoInformado;
            publicarMensagem(chamado, conteudo, publica, resultado.anexo(), usuario);
        }
        return montagem.completo(chamado, usuario.apenasCliente());
    }

    private static String destinoValido(String destino) {
        if (destino == null || destino.isBlank()) {
            return null;
        }
        String normalizado = destino.trim().toUpperCase(Locale.ROOT);
        if (!DESTINOS.contains(normalizado)) {
            throw ErroDeChamado.campoInvalido("destino", "O destino deve ser SOLICITANTE, INTERNO ou FORNECEDOR.");
        }
        return normalizado;
    }

    private Chamado chamadoParaAConversa(String codigo, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        if (!usuario.apenasCliente() && !acesso.podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Este chamado não está na fila do seu departamento.");
        }
        chamado.exigirConversaAberta();
        limiteDeMensagens.consumir(usuario.id().toString());
        return chamado;
    }

    private void publicarMensagem(Chamado chamado, String texto, boolean visivelCliente, AnexoResponse anexo, UsuarioAtual usuario) {
        boolean doSolicitante = usuario.apenasCliente();
        OffsetDateTime agora = agora();
        String acao = doSolicitante ? ACAO_DO_SOLICITANTE : visivelCliente ? ACAO_MENSAGEM_DA_EQUIPE : ACAO_NOTA_INTERNA;
        OrigemDaMensagem origem = doSolicitante ? OrigemDaMensagem.SOLICITANTE : OrigemDaMensagem.EQUIPE;
        Autor autor = autor(usuario);
        historico.registrarMensagem(chamado, acao, texto, autor, visivelCliente, origem, anexo == null ? null : anexo.id(), agora);
        if (doSolicitante) {
            avisosDaConversa.mensagemDoSolicitante(chamado, texto, autor, agora);
            retomarSeAguardavaOCliente(chamado, agora);
        } else if (visivelCliente) {
            chamado.registrarPrimeiraResposta(agora);
            avisosDaConversa.mensagemDaEquipe(chamado, texto, autor, agora);
        }
    }

    private void retomarSeAguardavaOCliente(Chamado chamado, OffsetDateTime agora) {
        if (!chamado.aguardaCliente()) {
            return;
        }
        StatusChamado destino = chamado.getAtendimentoResponsavel() == null ? StatusChamado.NA_FILA : StatusChamado.EM_ATENDIMENTO;
        StatusChamado anterior = chamado.alterarStatus(destino, null, agora);
        historico.registrarParaTodos(chamado, TipoEvento.STATUS, "Status alterado para " + destino.getRotulo(),
                anterior.getRotulo() + " → " + destino.getRotulo() + " · resposta do solicitante · relógio de resolução retomado",
                Autor.SISTEMA, agora);
        aviso.avisar(chamado, destino.getRotulo(), "O chamado " + chamado.getCodigo() + " mudou para " + destino.getRotulo() + ".", agora);
    }

    @Transactional
    public ChamadoResponse registrarLocalizacao(String codigo, DadosDeLocalizacao dados, UsuarioAtual usuario) {
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
