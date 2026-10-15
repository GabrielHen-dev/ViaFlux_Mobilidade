package br.com.viaflux.api.usuario;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
class UsuarioAdminService {

    private static final String PERFIL_ADMIN = "ADMIN";
    private static final String PERFIL_CLIENTE = "CLIENTE";
    private static final String PERFIL_GESTOR_FROTA = "GESTOR_FROTA";
    private static final String PERFIL_FORNECEDOR = "FORNECEDOR";
    private static final String PERFIL_DEPARTAMENTO = "DEPARTAMENTO";

    private final UsuarioRepository usuarios;
    private final PerfilRepository perfis;
    private final OrganizacaoRepository organizacoes;
    private final DepartamentoRepository departamentos;
    private final PasswordEncoder passwordEncoder;

    UsuarioAdminService(
            UsuarioRepository usuarios,
            PerfilRepository perfis,
            OrganizacaoRepository organizacoes,
            DepartamentoRepository departamentos,
            PasswordEncoder passwordEncoder
    ) {
        this.usuarios = usuarios;
        this.perfis = perfis;
        this.organizacoes = organizacoes;
        this.departamentos = departamentos;
        this.passwordEncoder = passwordEncoder;
    }

    UsuarioAdminOpcoesResponse opcoes() {
        return UsuarioAdminOpcoesResponse.de(
                perfis.findAllByOrderByDescricaoAsc(),
                departamentos.findAllByOrderByNomeAsc(),
                organizacoes.findAllByOrderByNomeAsc()
        );
    }

    UsuariosAdminPageResponse listar(int page, int size) {
        return UsuariosAdminPageResponse.de(usuarios.findAllByOrderByNomeAsc(
                PageRequest.of(page, size, Sort.by("nome").ascending())
        ));
    }

    UsuarioAdminResponse consultar(UUID id) {
        return UsuarioAdminResponse.de(buscarUsuario(id));
    }

    @Transactional
    UsuarioAdminResponse criar(CriarUsuarioRequest request) {
        String email = Usuario.normalizarEmail(request.email());
        if (usuarios.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um usuário com este e-mail.");
        }

        Set<Perfil> perfisDoUsuario = carregarPerfis(request.perfis());
        Organizacao organizacao = carregarOrganizacao(request.organizacaoId());
        Set<Departamento> departamentosDoUsuario = carregarDepartamentos(request.departamentos());
        validarVinculos(perfisDoUsuario, organizacao, departamentosDoUsuario);

        Usuario usuario = new Usuario(
                request.nome().trim(),
                email,
                passwordEncoder.encode(request.senha()),
                perfisDoUsuario,
                organizacao,
                departamentosDoUsuario
        );
        return UsuarioAdminResponse.de(usuarios.save(usuario));
    }

    @Transactional
    UsuarioAdminResponse atualizar(UUID id, AtualizarUsuarioRequest request) {
        Usuario usuario = buscarUsuario(id);
        String email = Usuario.normalizarEmail(request.email());
        usuarios.findByEmail(email)
                .filter(existente -> !existente.getId().equals(id))
                .ifPresent(existente -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um usuário com este e-mail.");
                });

        Set<Perfil> perfisDoUsuario = carregarPerfis(request.perfis());
        Organizacao organizacao = carregarOrganizacao(request.organizacaoId());
        Set<Departamento> departamentosDoUsuario = carregarDepartamentos(request.departamentos());
        validarVinculos(perfisDoUsuario, organizacao, departamentosDoUsuario);
        protegerUltimoAdministrador(usuario, perfisDoUsuario, usuario.isAtivo());

        usuario.atualizarDados(request.nome(), email);
        usuario.definirPerfis(perfisDoUsuario);
        usuario.vincularOrganizacao(organizacao);
        usuario.definirDepartamentos(departamentosDoUsuario);
        if (request.senha() != null && !request.senha().isBlank()) {
            usuario.atualizarSenhaHash(passwordEncoder.encode(request.senha()));
        }
        return UsuarioAdminResponse.de(usuario);
    }

    @Transactional
    UsuarioAdminResponse alterarAtivo(UUID id, boolean ativo, UUID solicitanteId) {
        Usuario usuario = buscarUsuario(id);
        if (!ativo && id.equals(solicitanteId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é permitido desativar a própria conta.");
        }
        protegerUltimoAdministrador(usuario, usuario.getPerfis(), ativo);
        usuario.alterarAtivo(ativo);
        return UsuarioAdminResponse.de(usuario);
    }

    @Transactional
    UsuarioResponse.OrganizacaoResponse criarOrganizacao(CriarOrganizacaoRequest request) {
        Organizacao organizacao = organizacoes.save(new Organizacao(request.nome(), request.tipo()));
        return new UsuarioResponse.OrganizacaoResponse(
                organizacao.getId(), organizacao.getNome(), organizacao.getTipo().name()
        );
    }

    private Usuario buscarUsuario(UUID id) {
        return usuarios.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado.")
        );
    }

    private Set<Perfil> carregarPerfis(Set<String> codigos) {
        List<Perfil> encontrados = perfis.findAllById(codigos);
        if (encontrados.size() != codigos.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Um ou mais perfis informados não existem.");
        }
        return new HashSet<>(encontrados);
    }

    private Organizacao carregarOrganizacao(UUID id) {
        if (id == null) {
            return null;
        }
        Organizacao organizacao = organizacoes.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "A organização informada não existe.")
        );
        if (!organizacao.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A organização informada está inativa.");
        }
        return organizacao;
    }

    private Set<Departamento> carregarDepartamentos(Set<String> codigos) {
        if (codigos == null || codigos.isEmpty()) {
            return Set.of();
        }
        List<Departamento> encontrados = departamentos.findAllById(codigos);
        if (encontrados.size() != codigos.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Um ou mais departamentos informados não existem.");
        }
        if (encontrados.stream().anyMatch(departamento -> !departamento.isAtivo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Um ou mais departamentos estão inativos.");
        }
        return new HashSet<>(encontrados);
    }

    private void validarVinculos(Set<Perfil> perfisDoUsuario, Organizacao organizacao,
                                 Set<Departamento> departamentosDoUsuario) {
        Set<String> codigos = perfisDoUsuario.stream().map(Perfil::getCodigo).collect(java.util.stream.Collectors.toSet());
        boolean cliente = codigos.contains(PERFIL_CLIENTE) || codigos.contains(PERFIL_GESTOR_FROTA);
        boolean fornecedor = codigos.contains(PERFIL_FORNECEDOR);

        if (cliente && fornecedor) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Um usuário não pode estar vinculado simultaneamente a uma organização cliente e fornecedora.");
        }
        if ((cliente || fornecedor) && organizacao == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O perfil selecionado exige vínculo com uma organização.");
        }
        if (cliente && organizacao.getTipo() != TipoOrganizacao.CLIENTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Os perfis de cliente exigem uma organização do tipo CLIENTE.");
        }
        if (fornecedor && organizacao.getTipo() != TipoOrganizacao.FORNECEDOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O perfil FORNECEDOR exige uma organização do tipo FORNECEDOR.");
        }
        if (codigos.contains(PERFIL_DEPARTAMENTO) && departamentosDoUsuario.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O perfil DEPARTAMENTO exige ao menos um departamento associado.");
        }
    }

    private void protegerUltimoAdministrador(Usuario usuario, Set<Perfil> novosPerfis, boolean ativoFuturo) {
        boolean administradorAtual = usuario.getPerfis().stream()
                .anyMatch(perfil -> PERFIL_ADMIN.equals(perfil.getCodigo()));
        boolean administradorFuturo = novosPerfis.stream()
                .anyMatch(perfil -> PERFIL_ADMIN.equals(perfil.getCodigo()));
        boolean deixaraDeSerAdminAtivo = usuario.isAtivo() && administradorAtual
                && (!ativoFuturo || !administradorFuturo);
        if (deixaraDeSerAdminAtivo && usuarios.countAtivosComPerfil(PERFIL_ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não é possível remover ou desativar o último administrador ativo.");
        }
    }
}
