package br.com.viaflux.api.shared.email;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ModelosDeEmail {

    private static final String PASTA_DOS_MODELOS = "templates/email/";
    private static final String CONTEUDO = "conteudo";
    private static final Pattern VARIAVEL = Pattern.compile("\\{\\{(\\w+)}}");

    private final Map<String, String> modelosLidos = new ConcurrentHashMap<>();

    public CaixaDeSaida.Mensagem montar(String para, String modelo, String assunto, String titulo, String acao, String link,
                                        Map<String, String> variaveis) {
        Map<String, String> valores = new HashMap<>(variaveis);
        valores.put("assunto", assunto);
        valores.put("titulo", titulo);
        valores.put("acao", acao);
        valores.put("link", link);

        Map<String, String> valoresDoTexto = new HashMap<>(valores);
        valoresDoTexto.put(CONTEUDO, preencher(ler(modelo + ".txt"), valoresDoTexto).strip());
        String texto = preencher(ler("layout.txt"), valoresDoTexto);

        Map<String, String> valoresDoHtml = new HashMap<>();
        valores.forEach((nome, valor) -> valoresDoHtml.put(nome, HtmlUtils.htmlEscape(valor, StandardCharsets.UTF_8.name())));
        valoresDoHtml.put(CONTEUDO, preencher(ler(modelo + ".html"), valoresDoHtml));
        String html = preencher(ler("layout.html"), valoresDoHtml);

        return new CaixaDeSaida.Mensagem(para, assunto, texto, html);
    }

    private String ler(String arquivo) {
        return modelosLidos.computeIfAbsent(arquivo, nome -> {
            try (InputStream conteudo = new ClassPathResource(PASTA_DOS_MODELOS + nome).getInputStream()) {
                return new String(conteudo.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException modeloAusente) {
                throw new UncheckedIOException("Modelo de e-mail não encontrado: " + nome, modeloAusente);
            }
        });
    }

    private static String preencher(String modelo, Map<String, String> valores) {
        Matcher variavel = VARIAVEL.matcher(modelo);
        StringBuilder resultado = new StringBuilder();
        while (variavel.find()) {
            String valor = valores.get(variavel.group(1));
            if (valor == null) {
                throw new IllegalStateException("Variável sem valor no modelo de e-mail: " + variavel.group(1));
            }
            variavel.appendReplacement(resultado, Matcher.quoteReplacement(valor));
        }
        variavel.appendTail(resultado);
        return resultado.toString();
    }
}
