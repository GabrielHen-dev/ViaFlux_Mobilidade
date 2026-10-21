package br.com.viaflux.api.chamado;

import br.com.viaflux.api.chamado.sla.RelogioCorrido;
import br.com.viaflux.api.chamado.sla.RelogioDeHorasUteis;
import br.com.viaflux.api.usuario.Organizacao;
import br.com.viaflux.api.usuario.Perfil;
import br.com.viaflux.api.usuario.TipoOrganizacao;
import br.com.viaflux.api.usuario.Usuario;
import br.com.viaflux.api.usuario.UsuarioAtual;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

final class ChamadosDeTeste {

    static final OffsetDateTime QUARTA_AS_DEZ = emSaoPaulo("2026-10-21T10:00");
    static final RelogioDeHorasUteis EXPEDIENTE = new RelogioDeHorasUteis(
            ChamadoConfig.FUSO_DA_OPERACAO, LocalTime.of(8, 0), LocalTime.of(18, 0));
    static final RelogioCorrido RELOGIO_CORRIDO = new RelogioCorrido();
    static final PrazosDeTriagemProperties PRAZOS_DE_TRIAGEM = new PrazosDeTriagemProperties(10, 20, 40);

    private ChamadosDeTeste() {
    }

    static OffsetDateTime emSaoPaulo(String dataHora) {
        return LocalDateTime.parse(dataHora).atZone(ChamadoConfig.FUSO_DA_OPERACAO).toOffsetDateTime()
                .withOffsetSameInstant(ZoneOffset.UTC);
    }

    static Clock relogioEm(OffsetDateTime instante) {
        return Clock.fixed(instante.toInstant(), ZoneOffset.UTC);
    }

    static Instant instante(String dataHoraEmSaoPaulo) {
        return emSaoPaulo(dataHoraEmSaoPaulo).toInstant();
    }

    static PoliticaDeSla politicaDeSla() {
        return new PoliticaDeSla(RELOGIO_CORRIDO, EXPEDIENTE);
    }

    static PoliticaDeTriagem politicaDeTriagem() {
        return new PoliticaDeTriagem(PRAZOS_DE_TRIAGEM, RELOGIO_CORRIDO);
    }

    static Motivo motivo(TipoChamado tipo, int severidade) {
        Motivo motivo = BeanUtils.instantiateClass(Motivo.class);
        ReflectionTestUtils.setField(motivo, "id", "M-" + tipo.name() + "-" + severidade);
        ReflectionTestUtils.setField(motivo, "tipo", tipo);
        ReflectionTestUtils.setField(motivo, "descricao", "Motivo de " + tipo.getNome());
        ReflectionTestUtils.setField(motivo, "severidade", severidade);
        return motivo;
    }

    static Contexto contexto(TipoChamado tipo, int urgencia) {
        Contexto contexto = BeanUtils.instantiateClass(Contexto.class);
        ReflectionTestUtils.setField(contexto, "id", "C-" + tipo.name() + "-" + urgencia);
        ReflectionTestUtils.setField(contexto, "tipo", tipo);
        ReflectionTestUtils.setField(contexto, "descricao", "Contexto de " + tipo.getNome());
        ReflectionTestUtils.setField(contexto, "urgencia", urgencia);
        return contexto;
    }

    static Perfil perfil(String codigo) {
        Perfil perfil = BeanUtils.instantiateClass(Perfil.class);
        ReflectionTestUtils.setField(perfil, "codigo", codigo);
        ReflectionTestUtils.setField(perfil, "descricao", codigo);
        return perfil;
    }

    static Usuario usuario(UUID id, String nome, String... perfis) {
        Set<Perfil> perfisDoUsuario = Arrays.stream(perfis).map(ChamadosDeTeste::perfil).collect(Collectors.toSet());
        Usuario usuario = new Usuario(nome, id + "@exemplo.com", "hash", perfisDoUsuario);
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }

    static Organizacao organizacao(String nome, TipoOrganizacao tipo) {
        Organizacao organizacao = new Organizacao(nome, tipo);
        ReflectionTestUtils.setField(organizacao, "id", UUID.randomUUID());
        return organizacao;
    }

    static UsuarioAtual atendente() {
        return new UsuarioAtual(UUID.randomUUID(), "Paula Atendente", Set.of("ATENDENTE"), Set.of(), null);
    }

    static UsuarioAtual admin() {
        return new UsuarioAtual(UUID.randomUUID(), "Adão Admin", Set.of("ADMIN"), Set.of(), null);
    }

    static UsuarioAtual lider() {
        return new UsuarioAtual(UUID.randomUUID(), "Lia Líder", Set.of("LIDER_OPERACIONAL"), Set.of(), null);
    }

    static UsuarioAtual departamento(TipoChamado... departamentos) {
        Set<String> codigos = Arrays.stream(departamentos).map(TipoChamado::name).collect(Collectors.toSet());
        return new UsuarioAtual(UUID.randomUUID(), "Equipe " + codigos, Set.of("DEPARTAMENTO"), codigos, null);
    }

    static UsuarioAtual cliente(UUID id) {
        return new UsuarioAtual(id, "Ana Cliente", Set.of("CLIENTE"), Set.of(), null);
    }

    static UsuarioAtual fornecedor(UUID organizacaoId) {
        return new UsuarioAtual(UUID.randomUUID(), "Gil Guincho", Set.of("FORNECEDOR"), Set.of(), organizacaoId);
    }

    static Autor autor(UsuarioAtual usuario) {
        return new Autor(usuario.id(), usuario.nome());
    }

    static Chamado chamadoAberto(String codigo, OffsetDateTime abertoEm) {
        return chamadoAberto(codigo, abertoEm, null, TipoChamado.MANUTENCAO, 3);
    }

    static Chamado chamadoAberto(String codigo, OffsetDateTime abertoEm, Usuario solicitante, TipoChamado tipo, int urgenciaDeclarada) {
        DadosDeAbertura dados = new DadosDeAbertura(
                "Maria Silva", null, "Volvo FH 460", "abc-1d23", "Motor não liga",
                DadosDeLocalizacao.apenasEndereco("BR-116, km 312"), solicitante, motivo(tipo, 3), contexto(tipo, urgenciaDeclarada),
                PRAZOS_DE_TRIAGEM.minutosPara(urgenciaDeclarada), null
        );
        return new Chamado(codigo, dados, abertoEm);
    }

    static Chamado chamadoTriado(String codigo, OffsetDateTime abertoEm, TipoChamado departamento, int severidade, int urgencia) {
        Chamado chamado = chamadoAberto(codigo, abertoEm, null, departamento, 3);
        chamado.concluirTriagem(departamento, severidade, urgencia, departamento, new Autor(UUID.randomUUID(), "Paula Atendente"),
                abertoEm.plusMinutes(5));
        return chamado;
    }

    static ErroDeChamado erroAo(ThrowingCallable acao) {
        Throwable erro = catchThrowable(acao);
        assertThat(erro).isInstanceOf(ErroDeChamado.class);
        return (ErroDeChamado) erro;
    }

    @SuppressWarnings("unchecked")
    static Map<String, String> errosDeCampo(ErroDeChamado erro) {
        return (Map<String, String>) erro.getBody().getProperties().get("errors");
    }
}
