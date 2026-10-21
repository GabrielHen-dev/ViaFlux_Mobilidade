package br.com.viaflux.api.chamado;

import java.io.InputStream;

interface ArmazenamentoDeArquivos {

    void guardar(String nome, InputStream conteudo);

    InputStream abrir(String nome);

    void remover(String nome);
}
