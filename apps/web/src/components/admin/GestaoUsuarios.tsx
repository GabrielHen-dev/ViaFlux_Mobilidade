"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Building2, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Send, UserPlus, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import Select from "@/components/ui/Select";
import {
  alterarUsuarioAtivo,
  atualizarUsuarioAdmin,
  buscarOpcoesAdmin,
  criarOrganizacaoAdmin,
  criarUsuarioAdmin,
  listarUsuariosAdmin,
  reenviarConviteAdmin,
  type DadosUsuarioAdmin,
  type OpcoesAdmin,
  type OrganizacaoAdmin,
  type UsuarioAdmin,
} from "@/services/api/admin-usuarios";

const inputClass = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-brand-dark outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 aria-[invalid=true]:border-red-400";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const acaoDaLinhaClass = "rounded-lg border border-[#E2E8F0] p-2 text-[#475569] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const PERFIS_DE_CLIENTE = ["CLIENTE", "GESTOR_FROTA"];
const PERFIS_COM_ORGANIZACAO = ["CLIENTE", "GESTOR_FROTA", "FORNECEDOR"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPOS_DE_ORGANIZACAO = [
  { valor: "CLIENTE", rotulo: "Cliente" },
  { valor: "FORNECEDOR", rotulo: "Fornecedor" },
];

const formVazio: DadosUsuarioAdmin = {
  nome: "", email: "", perfis: [], organizacaoId: null, departamentos: [],
};

type ErrosDosCampos = Partial<Record<"nome" | "email" | "organizacaoId", string>>;

function mensagemErro(erro: unknown) {
  if (erro instanceof ErroApi) {
    if (erro.status === 401) return "Sua sessão expirou. Entre novamente.";
    if (erro.status === 403) return "Você não tem permissão para esta operação.";
    return erro.message;
  }
  return "Tente novamente em instantes.";
}

function ehErroDeValidacao(erro: unknown): erro is ErroApi {
  return erro instanceof ErroApi && (erro.status === 400 || erro.status === 409);
}

function SituacaoDoUsuario({ usuario }: { usuario: UsuarioAdmin }) {
  const [rotulo, cor] = !usuario.ativo
    ? ["Inativo", "bg-slate-100 text-slate-600"]
    : usuario.convitePendente
      ? ["Convite pendente", "bg-amber-50 text-amber-700"]
      : ["Ativo", "bg-emerald-50 text-emerald-700"];
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${cor}`}>{rotulo}</span>;
}

export default function GestaoUsuarios() {
  const { estado } = useAuth();
  const token = estado.status === "autenticado" ? estado.accessToken : null;
  const idDoAdmin = estado.status === "autenticado" ? estado.usuario.id : "";
  const ehAdmin = estado.status === "autenticado" && estado.usuario.perfis.some((perfil) => perfil.codigo === "ADMIN");
  const [opcoes, setOpcoes] = useState<OpcoesAdmin | null>(null);
  const [pagina, setPagina] = useState(0);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [reenviandoPara, setReenviandoPara] = useState<string | null>(null);
  const [erroDeCarregamento, setErroDeCarregamento] = useState("");
  const [erroDoFormulario, setErroDoFormulario] = useState("");
  const [errosDosCampos, setErrosDosCampos] = useState<ErrosDosCampos>({});
  const [erroDaOrganizacao, setErroDaOrganizacao] = useState("");
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioAdmin | null>(null);
  const [form, setForm] = useState<DadosUsuarioAdmin>(formVazio);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalOrganizacao, setModalOrganizacao] = useState(false);
  const [nomeOrganizacao, setNomeOrganizacao] = useState("");
  const [tipoOrganizacao, setTipoOrganizacao] = useState<OrganizacaoAdmin["tipo"]>("CLIENTE");

  const carregar = useCallback(async () => {
    if (!token || !ehAdmin) return;
    try {
      const [resultado, listas] = await Promise.all([
        listarUsuariosAdmin(token, pagina),
        opcoes ? Promise.resolve(opcoes) : buscarOpcoesAdmin(token),
      ]);
      setUsuarios(resultado.content);
      setTotal(resultado.totalElements);
      setTotalPaginas(resultado.totalPages);
      setErroDeCarregamento("");
      if (!opcoes) setOpcoes(listas);
    } catch (erroApi) {
      setErroDeCarregamento(erroApi instanceof ErroApi ? mensagemErro(erroApi) : "Não foi possível carregar os usuários. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [token, ehAdmin, pagina, opcoes]);

  useEffect(() => {
    let ativo = true;
    void Promise.resolve().then(() => ativo ? carregar() : undefined);
    return () => { ativo = false; };
  }, [carregar]);

  const organizacoesDisponiveis = useMemo(() => {
    if (!opcoes) return [];
    const exigeCliente = form.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil));
    const exigeFornecedor = form.perfis.includes("FORNECEDOR");
    if (exigeCliente && exigeFornecedor) return [];
    if (exigeCliente) return opcoes.organizacoes.filter((org) => org.tipo === "CLIENTE");
    if (exigeFornecedor) return opcoes.organizacoes.filter((org) => org.tipo === "FORNECEDOR");
    return opcoes.organizacoes;
  }, [opcoes, form.perfis]);

  const limparErrosDoFormulario = () => {
    setErroDoFormulario("");
    setErrosDosCampos({});
  };

  const abrirConvite = () => {
    setUsuarioEmEdicao(null);
    setForm(formVazio);
    limparErrosDoFormulario();
    setModalUsuario(true);
  };

  const abrirEdicao = (usuario: UsuarioAdmin) => {
    setUsuarioEmEdicao(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      perfis: usuario.perfis.map((perfil) => perfil.codigo),
      organizacaoId: usuario.organizacao?.id ?? null,
      departamentos: usuario.departamentos.map((departamento) => departamento.codigo),
    });
    limparErrosDoFormulario();
    setModalUsuario(true);
  };

  const atualizarSelecao = (campo: "perfis" | "departamentos", codigo: string, marcado: boolean) => {
    setForm((atual) => {
      const selecao = marcado
        ? [...atual[campo], codigo]
        : atual[campo].filter((item) => item !== codigo);
      if (campo !== "perfis") return { ...atual, departamentos: selecao };

      const exigeCliente = selecao.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil));
      const exigeFornecedor = selecao.includes("FORNECEDOR");
      const organizacaoAtual = opcoes?.organizacoes.find((org) => org.id === atual.organizacaoId);
      const tipoCompativel = !organizacaoAtual || (!exigeCliente && !exigeFornecedor)
        || (exigeCliente && !exigeFornecedor && organizacaoAtual.tipo === "CLIENTE")
        || (exigeFornecedor && !exigeCliente && organizacaoAtual.tipo === "FORNECEDOR");
      return {
        ...atual,
        perfis: selecao,
        organizacaoId: tipoCompativel ? atual.organizacaoId : null,
      };
    });
  };

  const validarFormulario = () => {
    if (form.perfis.length === 0) return "Selecione ao menos um perfil.";
    if (form.perfis.includes("FORNECEDOR") && form.perfis.some((perfil) => PERFIS_DE_CLIENTE.includes(perfil))) {
      return "Perfis de cliente e fornecedor não podem ser combinados.";
    }
    if (form.perfis.includes("DEPARTAMENTO") && form.departamentos.length === 0) return "Selecione ao menos um departamento.";
    return "";
  };

  const salvarUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    limparErrosDoFormulario();
    const camposInvalidos: ErrosDosCampos = {};
    if (!form.nome.trim()) camposInvalidos.nome = "Informe o nome.";
    if (!EMAIL_VALIDO.test(form.email.trim())) camposInvalidos.email = "Informe um e-mail válido.";
    if (form.perfis.some((perfil) => PERFIS_COM_ORGANIZACAO.includes(perfil)) && !form.organizacaoId) {
      camposInvalidos.organizacaoId = "Selecione a organização.";
    }
    if (Object.keys(camposInvalidos).length > 0) { setErrosDosCampos(camposInvalidos); return; }
    const problema = validarFormulario();
    if (problema) { setErroDoFormulario(problema); return; }

    setSalvando(true);
    const dados: DadosUsuarioAdmin = { ...form, nome: form.nome.trim(), email: form.email.trim() };
    try {
      if (usuarioEmEdicao) {
        const atualizado = await atualizarUsuarioAdmin(token, usuarioEmEdicao.id, dados);
        const novoConvite = atualizado.convitePendente && atualizado.email !== usuarioEmEdicao.email;
        toast.success("Usuário atualizado", { description: novoConvite ? `Novo convite enviado para ${atualizado.email}` : atualizado.nome });
      } else {
        const convidado = await criarUsuarioAdmin(token, dados);
        toast.success("Convite enviado", { description: convidado.email });
      }
      setModalUsuario(false);
      await carregar();
    } catch (erroApi) {
      if (ehErroDeValidacao(erroApi)) {
        const campos: ErrosDosCampos = { ...erroApi.campos };
        if (erroApi.status === 409) campos.email = erroApi.message;
        setErrosDosCampos(campos);
        if (Object.keys(campos).length === 0) setErroDoFormulario(erroApi.message);
      } else {
        toast.error(usuarioEmEdicao ? "Não foi possível salvar as alterações" : "Não foi possível enviar o convite", { description: mensagemErro(erroApi) });
      }
    } finally {
      setSalvando(false);
    }
  };

  const reenviarConvite = async (usuario: UsuarioAdmin) => {
    if (!token) return;
    setReenviandoPara(usuario.id);
    try {
      await reenviarConviteAdmin(token, usuario.id);
      toast.success("Convite enviado", { description: usuario.email });
    } catch (erroApi) {
      toast.error("Não foi possível reenviar o convite", { description: mensagemErro(erroApi) });
      await carregar();
    } finally {
      setReenviandoPara(null);
    }
  };

  const alternarAtivo = async (usuario: UsuarioAdmin) => {
    if (!token) return;
    try {
      await alterarUsuarioAtivo(token, usuario.id, !usuario.ativo);
      toast.success(usuario.ativo ? "Usuário desativado" : "Usuário reativado", { description: usuario.nome });
      await carregar();
    } catch (erroApi) {
      toast.error(usuario.ativo ? "Não foi possível desativar o usuário" : "Não foi possível reativar o usuário", { description: mensagemErro(erroApi) });
    }
  };

  const salvarOrganizacao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (!nomeOrganizacao.trim()) { setErroDaOrganizacao("Informe o nome da organização."); return; }
    setSalvando(true);
    setErroDaOrganizacao("");
    try {
      const organizacao = await criarOrganizacaoAdmin(token, { nome: nomeOrganizacao.trim(), tipo: tipoOrganizacao });
      setOpcoes(await buscarOpcoesAdmin(token));
      setForm((atual) => ({ ...atual, organizacaoId: organizacao.id }));
      setErrosDosCampos((atuais) => ({ ...atuais, organizacaoId: undefined }));
      setModalOrganizacao(false);
      setNomeOrganizacao("");
      toast.success("Organização criada", { description: organizacao.nome });
    } catch (erroApi) {
      if (ehErroDeValidacao(erroApi)) setErroDaOrganizacao(erroApi.campos.nome ?? erroApi.message);
      else toast.error("Não foi possível criar a organização", { description: mensagemErro(erroApi) });
    } finally {
      setSalvando(false);
    }
  };

  if (estado.status === "verificando") {
    return <main id="conteudo" className="p-8 text-sm text-[#64748B]">Verificando sessão…</main>;
  }
  if (!ehAdmin) {
    return <main id="conteudo" className="p-4 md:p-8"><section className="max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-8"><h1 className="text-xl font-bold text-brand-navy">Acesso restrito</h1><p className="mt-2 text-sm text-[#64748B]">Disponível apenas para administradores.</p></section></main>;
  }

  const exigeOrganizacao = form.perfis.some((perfil) => PERFIS_COM_ORGANIZACAO.includes(perfil));

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Usuários</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Gerencie acessos, perfis e vínculos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`${buttonClass} border border-[#E2E8F0] bg-white text-brand-navy hover:bg-slate-50`} onClick={() => { setErroDaOrganizacao(""); setModalOrganizacao(true); }}>
            <Building2 size={16} /> Nova organização
          </button>
          <button className={`${buttonClass} text-white hover:opacity-90`} style={{ background: "var(--brand-green)" }} onClick={abrirConvite}>
            <UserPlus size={17} /> Convidar usuário
          </button>
        </div>
      </header>

      {erroDeCarregamento && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erroDeCarregamento}</div>}

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
          <div><h2 className="font-semibold text-brand-navy">Usuários cadastrados</h2><p className="mt-0.5 text-xs text-[#64748B]">{total} {total === 1 ? "usuário" : "usuários"}</p></div>
          <button onClick={() => { setCarregando(true); void carregar(); }} disabled={carregando} className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue disabled:opacity-50"><RefreshCw size={15} className={carregando ? "animate-spin" : ""} /> Atualizar</button>
        </div>
        {carregando ? <div role="status" className="p-8 text-center text-sm text-[#64748B]">Carregando usuários…</div> : usuarios.length === 0 ? <div className="p-10 text-center text-sm text-[#64748B]">Nenhum usuário encontrado.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#64748B]"><tr><th className="px-5 py-3 font-semibold">Usuário</th><th className="px-5 py-3 font-semibold">Perfil</th><th className="px-5 py-3 font-semibold">Organização / departamento</th><th className="px-5 py-3 font-semibold">Situação</th><th className="px-5 py-3 text-right font-semibold">Ações</th></tr></thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><div className="font-semibold text-brand-dark">{usuario.nome}</div><div className="mt-0.5 text-xs text-[#64748B]">{usuario.email}</div></td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{usuario.perfis.map((perfil) => <span key={perfil.codigo} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800" title={perfil.codigo}>{perfil.descricao}</span>)}</div></td>
                    <td className="px-5 py-4 text-xs text-[#475569]"><div>{usuario.organizacao?.nome ?? "—"}</div>{usuario.departamentos.length > 0 && <div className="mt-1 text-[#64748B]">{usuario.departamentos.map((item) => item.nome).join(", ")}</div>}</td>
                    <td className="px-5 py-4"><SituacaoDoUsuario usuario={usuario} /></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      {usuario.ativo && usuario.convitePendente && (
                        <button onClick={() => void reenviarConvite(usuario)} disabled={reenviandoPara === usuario.id} aria-label={`Reenviar convite para ${usuario.nome}`} title="Reenviar convite" className={acaoDaLinhaClass}><Send size={15} /></button>
                      )}
                      <button onClick={() => abrirEdicao(usuario)} aria-label={`Editar ${usuario.nome}`} title="Editar" className={acaoDaLinhaClass}><Pencil size={15} /></button>
                      <button onClick={() => void alternarAtivo(usuario)} disabled={usuario.id === idDoAdmin && usuario.ativo} title={usuario.ativo ? "Desativar" : "Reativar"} aria-label={usuario.ativo ? `Desativar ${usuario.nome}` : `Reativar ${usuario.nome}`} className={acaoDaLinhaClass}>{usuario.ativo ? <UserRoundX size={15} /> : <UserRoundCheck size={15} />}</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-3 text-xs text-[#64748B]">
          <span>Página {totalPaginas === 0 ? 0 : pagina + 1} de {totalPaginas}</span>
          <div className="flex gap-2"><button aria-label="Página anterior" disabled={pagina === 0 || carregando} onClick={() => { setCarregando(true); setPagina((atual) => atual - 1); }} className="rounded-lg border border-[#E2E8F0] p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><button aria-label="Próxima página" disabled={pagina + 1 >= totalPaginas || carregando} onClick={() => { setCarregando(true); setPagina((atual) => atual + 1); }} className="rounded-lg border border-[#E2E8F0] p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div>
        </footer>
      </section>

      {modalUsuario && opcoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setModalUsuario(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-usuario" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4"><div><h2 id="titulo-modal-usuario" className="text-lg font-bold text-brand-navy">{usuarioEmEdicao ? "Editar usuário" : "Convidar usuário"}</h2><p className="mt-0.5 text-xs text-[#64748B]">{usuarioEmEdicao ? "Atualize os dados e os acessos." : "O convite será enviado para o e-mail informado."}</p></div><button aria-label="Fechar" onClick={() => setModalUsuario(false)} disabled={salvando} className="rounded-lg p-2 text-[#64748B] hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={salvarUsuario} noValidate className="space-y-5 p-6">
              {erroDoFormulario && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erroDoFormulario}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="usuario-nome" className={labelClass}>Nome</label>
                  <input id="usuario-nome" className={inputClass} maxLength={120} required value={form.nome}
                    aria-invalid={errosDosCampos.nome ? true : undefined} aria-describedby={errosDosCampos.nome ? "usuario-nome-erro" : undefined}
                    onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))} />
                  {errosDosCampos.nome && <p id="usuario-nome-erro" className="mt-1 text-xs text-red-600">{errosDosCampos.nome}</p>}
                </div>
                <div>
                  <label htmlFor="usuario-email" className={labelClass}>E-mail</label>
                  <input id="usuario-email" type="email" className={inputClass} maxLength={254} required value={form.email}
                    aria-invalid={errosDosCampos.email ? true : undefined} aria-describedby={errosDosCampos.email ? "usuario-email-erro" : undefined}
                    onChange={(event) => setForm((atual) => ({ ...atual, email: event.target.value }))} />
                  {errosDosCampos.email && <p id="usuario-email-erro" className="mt-1 text-xs text-red-600">{errosDosCampos.email}</p>}
                </div>
              </div>
              <fieldset><legend className={labelClass}>Perfis de acesso</legend><div className="grid gap-2 sm:grid-cols-2">{opcoes.perfis.map((perfil) => <label key={perfil.codigo} className="flex items-start gap-2 rounded-lg border border-[#E2E8F0] p-3 text-sm text-brand-dark"><input type="checkbox" checked={form.perfis.includes(perfil.codigo)} onChange={(event) => atualizarSelecao("perfis", perfil.codigo, event.target.checked)} className="mt-0.5 accent-blue-600" /><span><span className="block font-medium">{perfil.descricao}</span><span className="text-xs text-[#64748B]">{perfil.codigo}</span></span></label>)}</div></fieldset>
              {exigeOrganizacao && (
                <div>
                  <label className={labelClass} htmlFor="usuario-organizacao">Organização</label>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        id="usuario-organizacao"
                        value={form.organizacaoId ?? ""}
                        onChange={(valor) => {
                          setForm((atual) => ({ ...atual, organizacaoId: valor || null }));
                          setErrosDosCampos((atuais) => ({ ...atuais, organizacaoId: undefined }));
                        }}
                        opcoes={organizacoesDisponiveis.map((org) => ({ valor: org.id, rotulo: org.nome, descricao: org.tipo === "CLIENTE" ? "Cliente" : "Fornecedor" }))}
                        placeholder="Selecione a organização"
                        aria-invalid={errosDosCampos.organizacaoId ? true : undefined}
                        aria-describedby={errosDosCampos.organizacaoId ? "usuario-organizacao-erro" : undefined}
                      />
                    </div>
                    <button type="button" onClick={() => { setErroDaOrganizacao(""); setTipoOrganizacao(form.perfis.includes("FORNECEDOR") ? "FORNECEDOR" : "CLIENTE"); setModalOrganizacao(true); }} className="shrink-0 rounded-lg border border-[#E2E8F0] px-3 text-brand-blue hover:bg-slate-50" aria-label="Nova organização" title="Nova organização"><Plus size={18} /></button>
                  </div>
                  {errosDosCampos.organizacaoId && <p id="usuario-organizacao-erro" className="mt-1 text-xs text-red-600">{errosDosCampos.organizacaoId}</p>}
                </div>
              )}
              {form.perfis.includes("DEPARTAMENTO") && <fieldset><legend className={labelClass}>Departamentos</legend><div className="grid gap-2 sm:grid-cols-2">{opcoes.departamentos.map((departamento) => <label key={departamento.codigo} className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] p-3 text-sm"><input type="checkbox" checked={form.departamentos.includes(departamento.codigo)} onChange={(event) => atualizarSelecao("departamentos", departamento.codigo, event.target.checked)} className="accent-blue-600" />{departamento.nome}</label>)}</div></fieldset>}
              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <button type="button" disabled={salvando} onClick={() => setModalUsuario(false)} className={`${buttonClass} border border-[#E2E8F0] bg-white text-[#475569]`}>Cancelar</button>
                <button type="submit" disabled={salvando} className={`${buttonClass} text-white`} style={{ background: "var(--brand-green)" }}>
                  {usuarioEmEdicao ? <Pencil size={16} /> : <Send size={16} />}
                  {salvando ? (usuarioEmEdicao ? "Salvando…" : "Enviando…") : (usuarioEmEdicao ? "Salvar alterações" : "Enviar convite")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalOrganizacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setModalOrganizacao(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-organizacao" className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4"><div><h2 id="titulo-modal-organizacao" className="text-lg font-bold text-brand-navy">Nova organização</h2><p className="mt-0.5 text-xs text-[#64748B]">Cliente ou fornecedor.</p></div><button aria-label="Fechar" onClick={() => setModalOrganizacao(false)} disabled={salvando} className="rounded-lg p-2 text-[#64748B] hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={salvarOrganizacao} noValidate className="space-y-4 p-6">
              <div>
                <label htmlFor="organizacao-nome" className={labelClass}>Nome</label>
                <input id="organizacao-nome" className={inputClass} maxLength={160} required value={nomeOrganizacao}
                  aria-invalid={erroDaOrganizacao ? true : undefined} aria-describedby={erroDaOrganizacao ? "organizacao-nome-erro" : undefined}
                  onChange={(event) => setNomeOrganizacao(event.target.value)} />
                {erroDaOrganizacao && <p id="organizacao-nome-erro" className="mt-1 text-xs text-red-600">{erroDaOrganizacao}</p>}
              </div>
              <div>
                <label htmlFor="organizacao-tipo" className={labelClass}>Tipo</label>
                <Select id="organizacao-tipo" value={tipoOrganizacao} onChange={(valor) => setTipoOrganizacao(valor as OrganizacaoAdmin["tipo"])} opcoes={TIPOS_DE_ORGANIZACAO} />
              </div>
              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" onClick={() => setModalOrganizacao(false)} disabled={salvando} className={`${buttonClass} border border-[#E2E8F0] bg-white text-[#475569]`}>Cancelar</button><button type="submit" disabled={salvando} className={`${buttonClass} text-white`} style={{ background: "var(--brand-green)" }}><Building2 size={16} />{salvando ? "Salvando…" : "Criar organização"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
