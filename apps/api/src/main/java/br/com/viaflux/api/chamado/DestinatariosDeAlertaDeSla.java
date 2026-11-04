package br.com.viaflux.api.chamado;

import br.com.viaflux.api.usuario.Usuario;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Component
class DestinatariosDeAlertaDeSla {

    record Destinatario(UUID id, String nome) {

        private static Destinatario de(Usuario usuario) {
            return new Destinatario(usuario.getId(), usuario.getNome());
        }
    }

    static final String PERFIL_LIDER_DO_DEPARTAMENTO = "LIDER_DEPARTAMENTO";
    static final String PERFIL_EQUIPE_DO_DEPARTAMENTO = "DEPARTAMENTO";
    static final Set<String> PERFIS_DA_CENTRAL_SEM_PLANTONISTA = Set.of("ATENDENTE");

    private final LiderancaRepository lideranca;
    private final EquipeDoDepartamentoRepository equipes;

    DestinatariosDeAlertaDeSla(LiderancaRepository lideranca, EquipeDoDepartamentoRepository equipes) {
        this.lideranca = lideranca;
        this.equipes = equipes;
    }

    List<Destinatario> doGatilho(Chamado chamado, LimiarDeSla limiar) {
        return switch (limiar) {
            case CINQUENTA_POR_CENTO -> responsavelAtual(chamado);
            case OITENTA_POR_CENTO -> semRepetir(lideresDoDepartamento(chamado), lideresOperacionais());
            case CEM_POR_CENTO -> semRepetir(lideresOperacionais(), responsavelAtual(chamado));
            case P1_SEM_PRIMEIRA_RESPOSTA -> semRepetir(centralOuPlantao(), lideresOperacionais());
        };
    }

    private List<Destinatario> responsavelAtual(Chamado chamado) {
        Autor responsavel = chamado.getAtendimentoResponsavel();
        if (responsavel != null && responsavel.id() != null) {
            return List.of(new Destinatario(responsavel.id(), responsavel.nome()));
        }
        return equipeDoDepartamento(chamado);
    }

    private List<Destinatario> lideresDoDepartamento(Chamado chamado) {
        if (chamado.getDepartamento() == null) {
            return List.of();
        }
        List<Usuario> lideres = equipes.ativosComPerfilNoDepartamento(PERFIL_LIDER_DO_DEPARTAMENTO, chamado.getDepartamento().name());
        return lideres.isEmpty() ? equipeDoDepartamento(chamado) : lideres.stream().map(Destinatario::de).toList();
    }

    private List<Destinatario> equipeDoDepartamento(Chamado chamado) {
        if (chamado.getDepartamento() == null) {
            return List.of();
        }
        return equipes.ativosComPerfilNoDepartamento(PERFIL_EQUIPE_DO_DEPARTAMENTO, chamado.getDepartamento().name()).stream()
                .map(Destinatario::de)
                .toList();
    }

    private List<Destinatario> lideresOperacionais() {
        List<Usuario> lideres = lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DA_LIDERANCA);
        List<Usuario> destinatarios = lideres.isEmpty() ? lideranca.ativosComPerfil(EscalonamentoService.PERFIS_DE_CONTINGENCIA) : lideres;
        return destinatarios.stream().map(Destinatario::de).toList();
    }

    private List<Destinatario> centralOuPlantao() {
        List<Usuario> plantonistas = equipes.ativosComPerfilNoDepartamento(PERFIL_EQUIPE_DO_DEPARTAMENTO, TipoChamado.ASSISTENCIA_24H.name());
        List<Usuario> destinatarios = plantonistas.isEmpty() ? lideranca.ativosComPerfil(PERFIS_DA_CENTRAL_SEM_PLANTONISTA) : plantonistas;
        return destinatarios.stream().map(Destinatario::de).toList();
    }

    private static List<Destinatario> semRepetir(List<Destinatario> primeiros, List<Destinatario> demais) {
        Map<UUID, Destinatario> porId = new LinkedHashMap<>();
        Stream.concat(primeiros.stream(), demais.stream()).forEach(destinatario -> porId.putIfAbsent(destinatario.id(), destinatario));
        return List.copyOf(porId.values());
    }
}
