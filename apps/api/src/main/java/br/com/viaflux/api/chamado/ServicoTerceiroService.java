package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Organizacao;
import br.com.viaflux.api.usuario.OrganizacaoRepository;
import br.com.viaflux.api.usuario.TipoOrganizacao;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
class ServicoTerceiroService {

    private final ServicoTerceiroRepository servicos;
    private final OrganizacaoRepository organizacoes;
    private final AcessoAosChamados acesso;
    private final HistoricoDoChamado historico;
    private final AvisoAoSolicitante aviso;
    private final MontagemDeChamado montagem;
    private final Clock relogio;

    ServicoTerceiroService(
            ServicoTerceiroRepository servicos,
            OrganizacaoRepository organizacoes,
            AcessoAosChamados acesso,
            HistoricoDoChamado historico,
            AvisoAoSolicitante aviso,
            MontagemDeChamado montagem,
            Clock relogio
    ) {
        this.servicos = servicos;
        this.organizacoes = organizacoes;
        this.acesso = acesso;
        this.historico = historico;
        this.aviso = aviso;
        this.montagem = montagem;
        this.relogio = relogio;
    }

    @Transactional(readOnly = true)
    List<FornecedorResponse> fornecedores() {
        return organizacoes.findByTipoAndAtivoTrueOrderByNomeAsc(TipoOrganizacao.FORNECEDOR).stream().map(FornecedorResponse::de).toList();
    }

    @Transactional
    ChamadoResponse vincular(String codigo, VinculoDeServicoRequest request, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        chamado.exigirTriagemConcluida();
        Organizacao fornecedor = organizacoes.findById(request.fornecedorId())
                .filter(organizacao -> organizacao.getTipo() == TipoOrganizacao.FORNECEDOR && organizacao.isAtivo())
                .orElseThrow(() -> ErroDeChamado.campoInvalido("fornecedorId", "Selecione um fornecedor credenciado."));
        boolean temServicoEmAndamento = servicos.findByChamadoIdAndCanceladoFalseOrderByAtualizadoEmDesc(chamado.getId()).stream()
                .anyMatch(ServicoTerceiro::emAndamento);
        if (temServicoEmAndamento) {
            throw ErroDeChamado.conflito("O chamado já tem um serviço terceirizado em andamento.");
        }
        OffsetDateTime agora = agora();
        Autor autor = new Autor(usuario.id(), usuario.nome());
        servicos.save(new ServicoTerceiro(chamado, fornecedor, request.tipoServico().trim(), texto(request.local()), texto(request.observacao()), autor, agora));
        historico.registrarInterno(chamado, TipoEvento.FORNECEDOR, "Serviço terceirizado acionado",
                fornecedor.getNome() + " · " + request.tipoServico().trim(), autor, agora);
        servicos.flush();
        return montagem.completo(chamado, false);
    }

    @Transactional
    void cancelar(String codigo, UUID servicoId, UsuarioAtual usuario) {
        Chamado chamado = acesso.paraConduzir(codigo, usuario);
        ServicoTerceiro servico = servicos.findById(servicoId)
                .filter(candidato -> candidato.getChamado().getId().equals(chamado.getId()) && !candidato.isCancelado())
                .orElseThrow(() -> ErroDeChamado.naoEncontrado("Serviço terceirizado não encontrado."));
        OffsetDateTime agora = agora();
        servico.cancelar(agora);
        historico.registrarInterno(chamado, TipoEvento.FORNECEDOR, "Serviço terceirizado cancelado",
                servico.getFornecedor().getNome() + " · " + servico.getTipoServico(), new Autor(usuario.id(), usuario.nome()), agora);
    }

    @Transactional(readOnly = true)
    List<ServicoDoFornecedorResponse> doFornecedor(UsuarioAtual usuario) {
        if (usuario.organizacaoId() == null) {
            return List.of();
        }
        return servicos.findByFornecedorIdAndCanceladoFalseOrderByAtualizadoEmDesc(usuario.organizacaoId()).stream()
                .filter(servico -> !servico.getChamado().naLixeira())
                .map(ServicoDoFornecedorResponse::de)
                .toList();
    }

    @Transactional
    ServicoDoFornecedorResponse atualizarPeloFornecedor(UUID servicoId, AtualizacaoDeServicoRequest request, UsuarioAtual usuario) {
        StatusServico novo = statusValido(request.status());
        ServicoTerceiro servico = servicos.findById(servicoId)
                .filter(candidato -> !candidato.isCancelado())
                .filter(candidato -> !candidato.getChamado().naLixeira())
                .filter(candidato -> candidato.getFornecedor().getId().equals(usuario.organizacaoId()))
                .orElseThrow(() -> ErroDeChamado.naoEncontrado("Serviço não encontrado para este fornecedor."));
        OffsetDateTime agora = agora();
        String observacao = texto(request.observacao());
        String fornecedor = servico.getFornecedor().getNome();
        servico.atualizar(novo, observacao, new Autor(usuario.id(), usuario.nome() + " · " + fornecedor), agora);
        Chamado chamado = servico.getChamado();
        historico.registrarInterno(chamado, TipoEvento.FORNECEDOR, "Fornecedor: " + novo.getRotulo(),
                fornecedor + (observacao.isEmpty() ? "" : " · " + observacao), new Autor(usuario.id(), fornecedor), agora);
        aviso.avisar(chamado, "Serviço terceirizado " + novo.getRotulo().toLowerCase(Locale.ROOT),
                "O serviço do chamado " + chamado.getCodigo() + " foi atualizado para " + novo.getRotulo() + ".", agora);
        servicos.flush();
        return ServicoDoFornecedorResponse.de(servico);
    }

    private static StatusServico statusValido(String valor) {
        try {
            return StatusServico.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException erro) {
            throw ErroDeChamado.campoInvalido("status", "Use Recebido, Em execução ou Concluído.");
        }
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private OffsetDateTime agora() {
        return OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
    }
}
