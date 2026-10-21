package br.com.viaflux.api.endereco;

public record EnderecoResponse(
        String descricao,
        String cep,
        String logradouro,
        String numero,
        String bairro,
        String cidade,
        String uf,
        Double latitude,
        Double longitude
) {

    static EnderecoResponse de(
            String cep,
            String logradouro,
            String numero,
            String bairro,
            String cidade,
            String uf,
            Double latitude,
            Double longitude,
            String descricaoAlternativa
    ) {
        String descricao = descrever(logradouro, numero, bairro, cidade, uf);
        if (descricao.isEmpty() && descricaoAlternativa != null) {
            descricao = descricaoAlternativa.trim();
        }
        return new EnderecoResponse(descricao, cep, logradouro, numero, bairro, cidade, uf, latitude, longitude);
    }

    private static String descrever(String logradouro, String numero, String bairro, String cidade, String uf) {
        String rua = juntar(", ", logradouro, numero);
        String cidadeComUf = juntar(" – ", cidade, uf);
        return juntar(" · ", rua, bairro, cidadeComUf);
    }

    private static String juntar(String separador, String... partes) {
        StringBuilder resultado = new StringBuilder();
        for (String parte : partes) {
            if (parte == null || parte.isBlank()) {
                continue;
            }
            if (!resultado.isEmpty()) {
                resultado.append(separador);
            }
            resultado.append(parte.trim());
        }
        return resultado.toString();
    }
}
