package br.com.viaflux.api.usuario;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public record UsuarioAtual(UUID id, String nome, Set<String> perfis, Set<String> departamentos, UUID organizacaoId,
                           boolean emailVerificado) {

    public UsuarioAtual(UUID id, String nome, Set<String> perfis, Set<String> departamentos, UUID organizacaoId) {
        this(id, nome, perfis, departamentos, organizacaoId, true);
    }

    public static final Set<String> PERFIS_COM_VISAO_GLOBAL = Set.of("ADMIN", "ATENDENTE", "LIDER_OPERACIONAL");
    public static final Set<String> PERFIS_DA_CENTRAL = Set.of("ADMIN", "ATENDENTE", "DEPARTAMENTO", "LIDER_OPERACIONAL");
    public static final Set<String> PERFIS_DE_TRIAGEM = Set.of("ADMIN", "ATENDENTE");
    public static final Set<String> PERFIS_QUE_CONDUZEM_QUALQUER_FILA = Set.of("ADMIN", "ATENDENTE");
    public static final Set<String> PERFIS_QUE_ATENDEM_QUALQUER_FILA = Set.of("ADMIN", "ATENDENTE");
    public static final Set<String> PERFIS_DE_CLIENTE = Set.of("CLIENTE", "GESTOR_FROTA");

    public boolean temAlgum(Collection<String> esperados) {
        return esperados.stream().anyMatch(perfis::contains);
    }

    public boolean visaoGlobal() {
        return temAlgum(PERFIS_COM_VISAO_GLOBAL);
    }

    public boolean daCentral() {
        return temAlgum(PERFIS_DA_CENTRAL);
    }

    public boolean fazTriagem() {
        return temAlgum(PERFIS_DE_TRIAGEM);
    }

    public boolean conduzQualquerFila() {
        return temAlgum(PERFIS_QUE_CONDUZEM_QUALQUER_FILA);
    }

    public boolean atendeQualquerFila() {
        return temAlgum(PERFIS_QUE_ATENDEM_QUALQUER_FILA);
    }

    public boolean departamento() {
        return perfis.contains("DEPARTAMENTO");
    }

    public boolean apenasCliente() {
        return temAlgum(PERFIS_DE_CLIENTE) && !daCentral();
    }

    public boolean atuaNoDepartamento(String codigo) {
        return departamento() && codigo != null && departamentos.contains(codigo);
    }
}
