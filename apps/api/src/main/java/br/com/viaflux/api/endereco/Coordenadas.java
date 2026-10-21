package br.com.viaflux.api.endereco;

import java.math.BigDecimal;
import java.math.RoundingMode;

record Coordenadas(double latitude, double longitude) {

    static boolean validas(double latitude, double longitude) {
        return Double.isFinite(latitude) && Double.isFinite(longitude)
                && latitude >= -90 && latitude <= 90
                && longitude >= -180 && longitude <= 180;
    }

    Coordenadas arredondadas(int casasDecimais) {
        return new Coordenadas(arredondar(latitude, casasDecimais), arredondar(longitude, casasDecimais));
    }

    String chave() {
        return BigDecimal.valueOf(latitude).toPlainString() + "," + BigDecimal.valueOf(longitude).toPlainString();
    }

    private static double arredondar(double valor, int casasDecimais) {
        return BigDecimal.valueOf(valor).setScale(casasDecimais, RoundingMode.HALF_UP).doubleValue();
    }
}
