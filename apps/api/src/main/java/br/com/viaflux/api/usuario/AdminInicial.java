package br.com.viaflux.api.usuario;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
@EnableConfigurationProperties(AdminInicialProperties.class)
class AdminInicial implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInicial.class);
    private static final String NOME_DO_ADMIN_INICIAL = "Administrador";

    private final UsuarioRepository usuarios;
    private final PerfilRepository perfis;
    private final PasswordEncoder passwordEncoder;
    private final AdminInicialProperties admin;

    AdminInicial(UsuarioRepository usuarios, PerfilRepository perfis, PasswordEncoder passwordEncoder, AdminInicialProperties admin) {
        this.usuarios = usuarios;
        this.perfis = perfis;
        this.passwordEncoder = passwordEncoder;
        this.admin = admin;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (usuarios.count() > 0) {
            return;
        }
        if (!admin.configurado()) {
            log.warn("Nenhum usuário cadastrado. Defina ADMIN_EMAIL e ADMIN_PASSWORD em infra/.env para criar o administrador inicial.");
            return;
        }
        Perfil perfilAdmin = perfis.findById(Perfil.ADMIN).orElseThrow();
        Usuario usuario = usuarios.save(new Usuario(
                NOME_DO_ADMIN_INICIAL,
                admin.email(),
                passwordEncoder.encode(admin.senha()),
                Set.of(perfilAdmin)
        ));
        log.info("Administrador inicial criado: {}", usuario.getEmail());
    }
}
