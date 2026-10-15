package br.com.viaflux.api.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(nullable = false)
    private boolean ativo = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "usuario_perfil",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "perfil_codigo")
    )
    private Set<Perfil> perfis = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizacao_id")
    private Organizacao organizacao;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "usuario_departamento",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "departamento_codigo")
    )
    private Set<Departamento> departamentos = new HashSet<>();

    protected Usuario() {
    }

    public Usuario(String nome, String email, String senhaHash, Set<Perfil> perfis) {
        this(nome, email, senhaHash, perfis, null, Set.of());
    }

    public Usuario(
            String nome,
            String email,
            String senhaHash,
            Set<Perfil> perfis,
            Organizacao organizacao,
            Set<Departamento> departamentos
    ) {
        this.nome = nome;
        this.email = normalizarEmail(email);
        this.senhaHash = senhaHash;
        this.perfis = new HashSet<>(perfis);
        this.organizacao = organizacao;
        this.departamentos = new HashSet<>(departamentos);
    }

    public static String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public Set<Perfil> getPerfis() {
        return Set.copyOf(perfis);
    }

    public Organizacao getOrganizacao() {
        return organizacao;
    }

    public Set<Departamento> getDepartamentos() {
        return Set.copyOf(departamentos);
    }

    public void definirPerfis(Set<Perfil> perfis) {
        this.perfis.clear();
        this.perfis.addAll(Objects.requireNonNull(perfis));
    }

    public void vincularOrganizacao(Organizacao organizacao) {
        this.organizacao = organizacao;
    }

    public void definirDepartamentos(Set<Departamento> departamentos) {
        this.departamentos.clear();
        this.departamentos.addAll(Objects.requireNonNull(departamentos));
    }

    public void atualizarDados(String nome, String email) {
        this.nome = nome.trim();
        this.email = normalizarEmail(email);
    }

    public void atualizarSenhaHash(String senhaHash) {
        this.senhaHash = Objects.requireNonNull(senhaHash);
    }

    public void alterarAtivo(boolean ativo) {
        this.ativo = ativo;
    }
}
