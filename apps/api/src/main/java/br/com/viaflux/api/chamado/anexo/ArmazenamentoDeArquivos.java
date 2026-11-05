package br.com.viaflux.api.chamado.anexo;

import java.io.InputStream;

public interface ArmazenamentoDeArquivos{

    public void guardar(String nome, InputStream conteudo);

    public InputStream abrir(String nome);

    public void remover(String nome);
}
