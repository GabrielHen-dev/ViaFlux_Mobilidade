package br.com.viaflux.api.chamado.sla;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

public final class RelogioDeHorasUteis implements Relogio {

    private static final double MILISSEGUNDOS_POR_MINUTO = 60_000d;
    private static final int LIMITE_DE_DIAS_PERCORRIDOS = 800;

    private final ZoneId fuso;
    private final LocalTime abertura;
    private final LocalTime fechamento;

    public RelogioDeHorasUteis(ZoneId fuso, LocalTime abertura, LocalTime fechamento) {
        this.fuso = fuso;
        this.abertura = abertura;
        this.fechamento = fechamento;
    }

    public boolean emExpediente(Instant instante) {
        ZonedDateTime local = instante.atZone(fuso);
        LocalTime hora = local.toLocalTime();
        return ehDiaUtil(local.toLocalDate()) && !hora.isBefore(abertura) && hora.isBefore(fechamento);
    }

    @Override
    public double minutosEntre(Instant inicio, Instant fim) {
        if (!fim.isAfter(inicio)) {
            return 0;
        }
        LocalDate dia = inicio.atZone(fuso).toLocalDate();
        LocalDate ultimoDia = fim.atZone(fuso).toLocalDate();
        double total = 0;
        for (int passo = 0; !dia.isAfter(ultimoDia) && passo < LIMITE_DE_DIAS_PERCORRIDOS; passo++) {
            if (ehDiaUtil(dia)) {
                Instant abre = inicioDoExpediente(dia);
                Instant fecha = fimDoExpediente(dia);
                Instant trechoInicio = inicio.isAfter(abre) ? inicio : abre;
                Instant trechoFim = fim.isBefore(fecha) ? fim : fecha;
                if (trechoFim.isAfter(trechoInicio)) {
                    total += Duration.between(trechoInicio, trechoFim).toMillis() / MILISSEGUNDOS_POR_MINUTO;
                }
            }
            dia = dia.plusDays(1);
        }
        return total;
    }

    @Override
    public Instant somarMinutos(Instant inicio, double minutos) {
        double restante = minutos;
        Instant cursor = inicio;
        LocalDate dia = inicio.atZone(fuso).toLocalDate();
        for (int passo = 0; passo < LIMITE_DE_DIAS_PERCORRIDOS; passo++) {
            if (ehDiaUtil(dia)) {
                Instant abre = inicioDoExpediente(dia);
                Instant fecha = fimDoExpediente(dia);
                Instant partida = cursor.isAfter(abre) ? cursor : abre;
                double disponivel = Duration.between(partida, fecha).toMillis() / MILISSEGUNDOS_POR_MINUTO;
                if (disponivel > 0) {
                    if (restante <= disponivel) {
                        return partida.plusMillis(Math.round(restante * MILISSEGUNDOS_POR_MINUTO));
                    }
                    restante -= disponivel;
                }
            }
            dia = dia.plusDays(1);
            cursor = inicioDoExpediente(dia);
        }
        return cursor;
    }

    public Instant somarDiasUteis(Instant inicio, int dias) {
        ZonedDateTime local = inicio.atZone(fuso);
        LocalDate dia = local.toLocalDate();
        int somados = 0;
        for (int passo = 0; somados < dias && passo < LIMITE_DE_DIAS_PERCORRIDOS; passo++) {
            dia = dia.plusDays(1);
            if (ehDiaUtil(dia)) {
                somados++;
            }
        }
        return dia.atTime(local.toLocalTime()).atZone(fuso).toInstant();
    }

    private Instant inicioDoExpediente(LocalDate dia) {
        return dia.atTime(abertura).atZone(fuso).toInstant();
    }

    private Instant fimDoExpediente(LocalDate dia) {
        return dia.atTime(fechamento).atZone(fuso).toInstant();
    }

    private static boolean ehDiaUtil(LocalDate dia) {
        DayOfWeek diaDaSemana = dia.getDayOfWeek();
        return diaDaSemana != DayOfWeek.SATURDAY && diaDaSemana != DayOfWeek.SUNDAY;
    }
}
