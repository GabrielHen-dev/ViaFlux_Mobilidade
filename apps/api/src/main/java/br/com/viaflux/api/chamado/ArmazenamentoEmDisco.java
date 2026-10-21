package br.com.viaflux.api.chamado;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Component
class ArmazenamentoEmDisco implements ArmazenamentoDeArquivos {

    private final Path diretorio;

    ArmazenamentoEmDisco(AnexosProperties propriedades) {
        this.diretorio = propriedades.diretorio().toAbsolutePath().normalize();
    }

    @Override
    public void guardar(String nome, InputStream conteudo) {
        try {
            Files.createDirectories(diretorio);
            Files.copy(conteudo, caminhoDe(nome), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException erro) {
            throw new UncheckedIOException("Não foi possível guardar o anexo.", erro);
        }
    }

    @Override
    public InputStream abrir(String nome) {
        try {
            return Files.newInputStream(caminhoDe(nome));
        } catch (NoSuchFileException erro) {
            throw ErroDeChamado.naoEncontrado("O arquivo do anexo não está mais disponível.");
        } catch (IOException erro) {
            throw new UncheckedIOException("Não foi possível ler o anexo.", erro);
        }
    }

    @Override
    public void remover(String nome) {
        try {
            Files.deleteIfExists(caminhoDe(nome));
        } catch (IOException erro) {
            throw new UncheckedIOException("Não foi possível remover o anexo.", erro);
        }
    }

    private Path caminhoDe(String nome) {
        Path caminho = diretorio.resolve(nome).normalize();
        if (!caminho.startsWith(diretorio)) {
            throw ErroDeChamado.invalido("Nome de arquivo inválido.");
        }
        return caminho;
    }
}
