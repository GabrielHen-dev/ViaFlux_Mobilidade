package br.com.viaflux.api.chamado;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

final class ClassificacaoPorTexto {

    record Sugestao(TipoChamado tipo, int severidade, int urgencia, Motivo motivo, Set<String> termos) {

        String descrever() {
            String base = motivo != null ? "Motivo mais próximo: " + motivo.getDescricao() : "Área sugerida: " + tipo.getNome();
            return termos.isEmpty() ? base + " · sem termos reconhecidos" : base + " · termos: " + String.join(", ", termos);
        }
    }

    static final TipoChamado TIPO_SEM_CORRESPONDENCIA = TipoChamado.ASSISTENCIA_24H;

    private static final int TAMANHO_DO_RADICAL = 5;
    private static final int TAMANHO_MINIMO_DO_TERMO = 3;
    private static final int PESO_DO_MOTIVO = 2;
    private static final int CORRESPONDENCIA_MINIMA_COM_O_MOTIVO = 2;
    private static final int PESO_MEDIO = 3;

    private static final Set<String> PALAVRAS_IGNORADAS = Set.of(
            "com", "sem", "para", "por", "uma", "umas", "uns", "dos", "das", "nos", "nas", "que", "mas", "meu", "minha", "seu", "sua",
            "esta", "este", "isso", "isto", "esse", "essa", "foi", "ser", "ter", "tem", "estou", "estava", "pelo", "pela",
            "muito", "mais", "menos", "ainda", "outro", "outra", "carro", "veiculo", "cliente", "favor", "preciso", "problema"
    );

    private static final Map<TipoChamado, Set<String>> VOCABULARIO = new EnumMap<>(Map.of(
            TipoChamado.ASSISTENCIA_24H, radicais("guincho", "reboque", "socorro", "pane", "bateria", "pneu", "estepe", "batida",
                    "bateu", "acidente", "colisao", "roubo", "roubado", "furto", "assalto", "chave", "trancado", "atolado", "combustivel"),
            TipoChamado.MANUTENCAO, radicais("freio", "motor", "oleo", "revisao", "barulho", "ruido", "oficina", "suspensao", "embreagem",
                    "cambio", "superaquecimento", "vazamento", "painel", "injecao", "direcao", "condicionado", "vidro", "trava", "lampada"),
            TipoChamado.LOGISTICA, radicais("entrega", "retirada", "devolucao", "reserva", "transferencia", "vistoria", "checklist",
                    "disponivel", "patio", "frota", "unidade", "substituicao", "atraso"),
            TipoChamado.TI, radicais("sistema", "internet", "rede", "senha", "acesso", "login", "impressora", "totem", "aplicativo",
                    "site", "portal", "computador", "terminal", "leitor"),
            TipoChamado.FINANCEIRO, radicais("cobranca", "cobrado", "fatura", "boleto", "nota", "fiscal", "pagamento", "reembolso", "multa",
                    "pedagio", "caucao", "cartao", "valor", "estorno", "debito", "credito", "dinheiro"),
            TipoChamado.CONTRATOS, radicais("contrato", "renovacao", "prorrogacao", "condutor", "clausula", "franquia", "seguro",
                    "aditivo", "plano", "quilometragem", "cobertura")
    ));

    private static final Set<String> SINAIS_DE_URGENCIA_ALTA = radicais("urgente", "urgencia", "emergencia", "parado", "rodovia",
            "estrada", "risco", "perigo", "acidente", "socorro", "imediato", "agora", "bloqueado", "impedido", "travado", "ferido");
    private static final Set<String> SINAIS_DE_URGENCIA_BAIXA = radicais("agendar", "agendamento", "duvida", "programado",
            "programada", "informacao", "consulta", "futuro", "proxima", "semana");

    private ClassificacaoPorTexto() {
    }

    static Sugestao sugerir(String texto, List<Motivo> motivos) {
        Map<String, String> palavrasDoTexto = palavrasPorRadical(texto);
        Set<String> radicaisDoTexto = palavrasDoTexto.keySet();
        Map<TipoChamado, Set<String>> encontradosPorTipo = new EnumMap<>(TipoChamado.class);
        VOCABULARIO.forEach((tipo, vocabulario) -> encontradosPorTipo.put(tipo, intersecao(radicaisDoTexto, vocabulario)));

        Motivo melhorMotivo = null;
        Set<String> termosDoMotivo = Set.of();
        int melhorPontuacao = 0;
        for (Motivo motivo : motivos) {
            Set<String> emComum = intersecao(radicaisDoTexto, radicais(motivo.getDescricao()));
            int pontuacao = emComum.size() * PESO_DO_MOTIVO + encontradosPorTipo.getOrDefault(motivo.getTipo(), Set.of()).size();
            if (emComum.size() >= CORRESPONDENCIA_MINIMA_COM_O_MOTIVO && pontuacao > melhorPontuacao) {
                melhorMotivo = motivo;
                termosDoMotivo = emComum;
                melhorPontuacao = pontuacao;
            }
        }

        int urgencia = urgencia(radicaisDoTexto);
        if (melhorMotivo != null) {
            Set<String> termos = new LinkedHashSet<>(termosDoMotivo);
            termos.addAll(encontradosPorTipo.getOrDefault(melhorMotivo.getTipo(), Set.of()));
            return new Sugestao(melhorMotivo.getTipo(), melhorMotivo.getSeveridade(), urgencia, melhorMotivo, originais(termos, palavrasDoTexto));
        }

        return encontradosPorTipo.entrySet().stream()
                .filter(entrada -> !entrada.getValue().isEmpty())
                .max(Comparator.comparingInt((Map.Entry<TipoChamado, Set<String>> entrada) -> entrada.getValue().size())
                        .thenComparing(entrada -> -entrada.getKey().ordinal()))
                .map(entrada -> new Sugestao(entrada.getKey(), PESO_MEDIO, urgencia, null, originais(entrada.getValue(), palavrasDoTexto)))
                .orElseGet(() -> new Sugestao(TIPO_SEM_CORRESPONDENCIA, PESO_MEDIO, urgencia, null, Set.of()));
    }

    private static int urgencia(Set<String> radicaisDoTexto) {
        if (!intersecao(radicaisDoTexto, SINAIS_DE_URGENCIA_ALTA).isEmpty()) {
            return 5;
        }
        if (!intersecao(radicaisDoTexto, SINAIS_DE_URGENCIA_BAIXA).isEmpty()) {
            return 1;
        }
        return PESO_MEDIO;
    }

    private static Set<String> intersecao(Set<String> texto, Set<String> referencia) {
        return texto.stream().filter(referencia::contains).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<String> originais(Set<String> radicaisEncontrados, Map<String, String> palavrasDoTexto) {
        return radicaisEncontrados.stream().map(palavrasDoTexto::get).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<String> radicais(String... palavras) {
        return palavrasPorRadical(String.join(" ", palavras)).keySet();
    }

    private static Map<String, String> palavrasPorRadical(String texto) {
        Map<String, String> palavras = new LinkedHashMap<>();
        if (texto == null || texto.isBlank()) {
            return palavras;
        }
        for (String original : texto.toLowerCase(Locale.ROOT).split("[^\\p{L}0-9]+")) {
            String palavra = Normalizer.normalize(original, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
            if (palavra.length() < TAMANHO_MINIMO_DO_TERMO || PALAVRAS_IGNORADAS.contains(palavra)) {
                continue;
            }
            palavras.putIfAbsent(palavra.length() > TAMANHO_DO_RADICAL ? palavra.substring(0, TAMANHO_DO_RADICAL) : palavra, original);
        }
        return palavras;
    }
}
