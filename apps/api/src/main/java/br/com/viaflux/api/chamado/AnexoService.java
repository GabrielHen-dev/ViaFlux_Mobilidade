package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.UsuarioAtual;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

@Service
class AnexoService {

    record Resultado(AnexoResponse anexo, boolean criado) {
    }

    record Conteudo(String nome, String tipoConteudo, long tamanho, InputStream dados) {
    }

    private final AcessoAosChamados acesso;
    private final ChamadoAnexoRepository anexos;
    private final ArmazenamentoDeArquivos armazenamento;
    private final HistoricoDoChamado historico;
    private final AnexosProperties propriedades;
    private final Clock relogio;

    AnexoService(
            AcessoAosChamados acesso,
            ChamadoAnexoRepository anexos,
            ArmazenamentoDeArquivos armazenamento,
            HistoricoDoChamado historico,
            AnexosProperties propriedades,
            Clock relogio
    ) {
        this.acesso = acesso;
        this.anexos = anexos;
        this.armazenamento = armazenamento;
        this.historico = historico;
        this.propriedades = propriedades;
        this.relogio = relogio;
    }

    @Transactional
    Resultado enviar(String codigo, MultipartFile arquivo, String chaveIdempotencia, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        if (!usuario.apenasCliente() && !acesso.podeConduzir(chamado, usuario)) {
            throw ErroDeChamado.proibido("Seu perfil só acompanha este chamado.");
        }
        String chave = chaveIdempotencia == null || chaveIdempotencia.isBlank() ? null : usuario.id() + ":" + chaveIdempotencia.trim();
        Optional<ChamadoAnexo> existente = chave == null ? Optional.empty() : anexos.findByChamadoIdAndChaveIdempotencia(chamado.getId(), chave);
        if (existente.isPresent()) {
            return new Resultado(AnexoResponse.de(existente.get()), false);
        }
        String nome = validar(arquivo);
        OffsetDateTime agora = OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC);
        Autor autor = new Autor(usuario.id(), usuario.nome());
        ChamadoAnexo anexo = anexos.save(new ChamadoAnexo(chamado, nome, arquivo.getContentType(), arquivo.getSize(), autor, chave, agora));
        try (InputStream conteudo = arquivo.getInputStream()) {
            armazenamento.guardar(anexo.getArquivo(), conteudo);
        } catch (IOException erro) {
            throw new UncheckedIOException("Não foi possível ler o arquivo enviado.", erro);
        }
        historico.registrarParaTodos(chamado, TipoEvento.ANEXO, "Anexo adicionado", nome, autor, agora);
        return new Resultado(AnexoResponse.de(anexo), true);
    }

    @Transactional(readOnly = true)
    Conteudo abrir(String codigo, UUID anexoId, UsuarioAtual usuario) {
        Chamado chamado = acesso.visivel(codigo, usuario);
        ChamadoAnexo anexo = anexos.findByIdAndChamadoId(anexoId, chamado.getId())
                .orElseThrow(() -> ErroDeChamado.naoEncontrado("Anexo não encontrado."));
        return new Conteudo(anexo.getNome(), anexo.getTipoConteudo(), anexo.getTamanho(), armazenamento.abrir(anexo.getArquivo()));
    }

    private String validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw ErroDeChamado.campoInvalido("arquivo", "Selecione um arquivo.");
        }
        String nome = arquivo.getOriginalFilename() == null || arquivo.getOriginalFilename().isBlank()
                ? "arquivo"
                : arquivo.getOriginalFilename().replaceAll("[\\\\/]", "_");
        if (!AnexosProperties.TIPOS_PERMITIDOS.contains(arquivo.getContentType())) {
            throw ErroDeChamado.formatoNaoSuportado("\"" + nome + "\" não foi aceito: envie fotos PNG ou JPG, ou documentos PDF.");
        }
        if (arquivo.getSize() > propriedades.limiteBytes()) {
            throw ErroDeChamado.arquivoGrandeDemais("\"" + nome + "\" não foi aceito: o limite é de " + propriedades.limiteMb() + " MB por arquivo.");
        }
        return nome;
    }
}
