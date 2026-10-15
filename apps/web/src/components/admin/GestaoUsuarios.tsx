"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, UserRound, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { ErroApi } from "@/services/api/cliente";
import {
  alterarUsuarioAtivo,
  atualizarUsuarioAdmin,
  buscarOpcoesAdmin,
  criarOrganizacaoAdmin,
  criarUsuarioAdmin,
  listarUsuariosAdmin,
  type DadosUsuarioAdmin,
  type OpcoesAdmin,
  type OrganizacaoAdmin,
  type UsuarioAdmin,
} from "@/services/api/admin-usuarios";

const inputClass = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-brand-dark outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#475569]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const formVazio: DadosUsuarioAdmin = {
  nome: "", email: "", senha: "", perfis: [], organizacaoId: null, departamentos: [],
};

function mensagemErro(erro: unknown) {
  if (erro instanceof ErroApi) {
    if (erro.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
    if (erro.status === 403) return "Seu usuário não tem permissão de administrador para esta operação.";
    return erro.message;
  }
  return "Não foi possível concluir a operação. Tente novamente.";
}

export default function GestaoUsuarios() {
  const { estado } = useAuth();
  const token = estado.status === "autenticado" ? estado.accessToken : null;
  const ehAdmin = estado.status === "autenticado" && estado.usuario.perfis.some((perfil) => perfil.codigo === "ADMIN");
  const [opcoes, setOpcoes] = useState<OpcoesAdmin | null>(null);
  const [pagina, setPagina] = useState(0);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
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
      if (!opcoes) setOpcoes(listas);
    } catch (erroApi) {
      setErro(mensagemErro(erroApi));
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
    const exigeCliente = form.perfis.some((perfil) => perfil === "CLIENTE" || perfil === "GESTOR_FROTA");
    const exigeFornecedor = form.perfis.includes("FORNECEDOR");
    if (exigeCliente && exigeFornecedor) return [];
    if (exigeCliente) return opcoes.organizacoes.filter((org) => org.tipo === "CLIENTE");
    if (exigeFornecedor) return opcoes.organizacoes.filter((org) => org.tipo === "FORNECEDOR");
    return opcoes.organizacoes;
  }, [opcoes, form.perfis]);

  const abrirCriacao = () => {
    setUsuarioEmEdicao(null);
    setForm(formVazio);
    setErro("");
    setModalUsuario(true);
  };

  const abrirEdicao = (usuario: UsuarioAdmin) => {
    setUsuarioEmEdicao(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfis: usuario.perfis.map((perfil) => perfil.codigo),
      organizacaoId: usuario.organizacao?.id ?? null,
      departamentos: usuario.departamentos.map((departamento) => departamento.codigo),
    });
    setErro("");
    setModalUsuario(true);
  };

  const atualizarSelecao = (campo: "perfis" | "departamentos", codigo: string, marcado: boolean) => {
    setForm((atual) => {
      const selecao = marcado
        ? [...atual[campo], codigo]
        : atual[campo].filter((item) => item !== codigo);
      if (campo !== "perfis") return { ...atual, departamentos: selecao };

      const exigeCliente = selecao.some((perfil) => perfil === "CLIENTE" || perfil === "GESTOR_FROTA");
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

  const salvarUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (form.perfis.length === 0) { setErro("Selecione ao menos um perfil."); return; }
    if (form.perfis.includes("FORNECEDOR") && form.perfis.some((perfil) => perfil === "CLIENTE" || perfil === "GESTOR_FROTA")) {
      setErro("Os perfis de cliente e fornecedor não podem ser combinados no mesmo usuário."); return;
    }
    if (form.perfis.includes("DEPARTAMENTO") && form.departamentos.length === 0) {
      setErro("Selecione ao menos um departamento para este perfil."); return;
    }
    if (form.perfis.some((perfil) => ["CLIENTE", "GESTOR_FROTA", "FORNECEDOR"].includes(perfil)) && !form.organizacaoId) {
      setErro("Selecione a organização vinculada ao usuário."); return;
    }

    setSalvando(true);
    setErro("");
    try {
      const payload = { ...form, senha: form.senha?.trim() || undefined };
      if (usuarioEmEdicao) await atualizarUsuarioAdmin(token, usuarioEmEdicao.id, payload);
      else await criarUsuarioAdmin(token, payload);
      setModalUsuario(false);
      setAviso(usuarioEmEdicao ? "Usuário atualizado." : "Usuário criado.");
      await carregar();
    } catch (erroApi) {
      setErro(mensagemErro(erroApi));
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (usuario: UsuarioAdmin) => {
    if (!token) return;
    setErro("");
    setAviso("");
    try {
      await alterarUsuarioAtivo(token, usuario.id, !usuario.ativo);
      setAviso(usuario.ativo ? "Usuário desativado." : "Usuário reativado.");
      await carregar();
    } catch (erroApi) {
      setErro(mensagemErro(erroApi));
    }
  };

  const salvarOrganizacao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !nomeOrganizacao.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const organizacao = await criarOrganizacaoAdmin(token, { nome: nomeOrganizacao.trim(), tipo: tipoOrganizacao });
      const listas = await buscarOpcoesAdmin(token);
      setOpcoes(listas);
      setForm((atual) => ({ ...atual, organizacaoId: organizacao.id }));
      setModalOrganizacao(false);
      setNomeOrganizacao("");
      setAviso("Organização criada e selecionada no formulário do usuário.");
    } catch (erroApi) {
      setErro(mensagemErro(erroApi));
    } finally {
      setSalvando(false);
    }
  };

  if (estado.status === "verificando") {
    return <main id="conteudo" className="p-8 text-sm text-[#64748B]">Verificando sessão…</main>;
  }
  if (!ehAdmin) {
    return <main id="conteudo" className="p-4 md:p-8"><section className="max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-8"><h1 className="text-xl font-bold text-brand-navy">Acesso restrito</h1><p className="mt-2 text-sm text-[#64748B]">A gestão de usuários está disponível apenas para administradores.</p></section></main>;
  }

  return (
    <main id="conteudo" className="min-w-0 p-4 md:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>Usuários</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Administre acessos, perfis, departamentos e organizações.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`${buttonClass} border border-[#E2E8F0] bg-white text-brand-navy hover:bg-slate-50`} onClick={() => { setErro(""); setModalOrganizacao(true); }}>
            <Building2 size={16} /> Nova organização
          </button>
          <button className={`${buttonClass} text-white hover:opacity-90`} style={{ background: "var(--brand-green)" }} onClick={abrirCriacao}>
            <Plus size={17} /> Novo usuário
          </button>
        </div>
      </header>

      {erro && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
      {aviso && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}<button className="ml-3 underline" onClick={() => setAviso("")}>Fechar</button></div>}

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
          <div><h2 className="font-semibold text-brand-navy">Usuários cadastrados</h2><p className="mt-0.5 text-xs text-[#64748B]">{total} registro(s)</p></div>
          <button onClick={() => { setCarregando(true); setErro(""); void carregar(); }} disabled={carregando} className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue disabled:opacity-50"><RefreshCw size={15} className={carregando ? "animate-spin" : ""} /> Atualizar</button>
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
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${usuario.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{usuario.ativo ? "Ativo" : "Inativo"}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      <button onClick={() => abrirEdicao(usuario)} aria-label={`Editar ${usuario.nome}`} title="Editar" className="rounded-lg border border-[#E2E8F0] p-2 text-[#475569] hover:bg-slate-50"><Pencil size={15} /></button>
                      <button onClick={() => void alternarAtivo(usuario)} disabled={usuario.id === (estado.status === "autenticado" ? estado.usuario.id : "") && usuario.ativo} title={usuario.ativo ? "Desativar usuário" : "Reativar usuário"} aria-label={usuario.ativo ? `Desativar ${usuario.nome}` : `Reativar ${usuario.nome}`} className="rounded-lg border border-[#E2E8F0] p-2 text-[#475569] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{usuario.ativo ? <UserRoundX size={15} /> : <UserRoundCheck size={15} />}</button>
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
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4"><div><h2 id="titulo-modal-usuario" className="text-lg font-bold text-brand-navy">{usuarioEmEdicao ? "Editar usuário" : "Novo usuário"}</h2><p className="mt-0.5 text-xs text-[#64748B]">Preencha os dados e atribua os acessos.</p></div><button aria-label="Fechar" onClick={() => setModalUsuario(false)} disabled={salvando} className="rounded-lg p-2 text-[#64748B] hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={salvarUsuario} className="space-y-5 p-6">
              {erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}
              <div className="grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Nome</span><input className={inputClass} maxLength={120} required value={form.nome} onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))} /></label><label><span className={labelClass}>E-mail</span><input type="email" className={inputClass} maxLength={254} required value={form.email} onChange={(event) => setForm((atual) => ({ ...atual, email: event.target.value }))} /></label></div>
              <label className="block"><span className={labelClass}>{usuarioEmEdicao ? "Nova senha (opcional)" : "Senha inicial"}</span><input type="password" className={inputClass} minLength={8} maxLength={100} required={!usuarioEmEdicao} autoComplete="new-password" value={form.senha ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, senha: event.target.value }))} placeholder={usuarioEmEdicao ? "Deixe em branco para manter a atual" : "Mínimo de 8 caracteres"} /></label>
              <fieldset><legend className={labelClass}>Perfis de acesso</legend><div className="grid gap-2 sm:grid-cols-2">{opcoes.perfis.map((perfil) => <label key={perfil.codigo} className="flex items-start gap-2 rounded-lg border border-[#E2E8F0] p-3 text-sm text-brand-dark"><input type="checkbox" checked={form.perfis.includes(perfil.codigo)} onChange={(event) => atualizarSelecao("perfis", perfil.codigo, event.target.checked)} className="mt-0.5 accent-blue-600" /><span><span className="block font-medium">{perfil.descricao}</span><span className="text-xs text-[#64748B]">{perfil.codigo}</span></span></label>)}</div></fieldset>
              {form.perfis.some((perfil) => ["CLIENTE", "GESTOR_FROTA", "FORNECEDOR"].includes(perfil)) && <div><label className={labelClass} htmlFor="organizacao">Organização vinculada</label><div className="flex gap-2"><select id="organizacao" className={inputClass} required value={form.organizacaoId ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, organizacaoId: event.target.value || null }))}><option value="">Selecione uma organização</option>{organizacoesDisponiveis.map((org) => <option key={org.id} value={org.id}>{org.nome} · {org.tipo === "CLIENTE" ? "Cliente" : "Fornecedor"}</option>)}</select><button type="button" onClick={() => { setTipoOrganizacao(form.perfis.includes("FORNECEDOR") ? "FORNECEDOR" : "CLIENTE"); setModalOrganizacao(true); }} className="shrink-0 rounded-lg border border-[#E2E8F0] px-3 text-brand-blue hover:bg-slate-50" aria-label="Criar organização"><Plus size={18} /></button></div><p className="mt-1 text-xs text-[#64748B]">Se a organização não existir, crie-a pelo botão acima.</p></div>}
              {form.perfis.includes("DEPARTAMENTO") && <fieldset><legend className={labelClass}>Departamentos associados</legend><div className="grid gap-2 sm:grid-cols-2">{opcoes.departamentos.map((departamento) => <label key={departamento.codigo} className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] p-3 text-sm"><input type="checkbox" checked={form.departamentos.includes(departamento.codigo)} onChange={(event) => atualizarSelecao("departamentos", departamento.codigo, event.target.checked)} className="accent-blue-600" />{departamento.nome}</label>)}</div></fieldset>}
              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" disabled={salvando} onClick={() => setModalUsuario(false)} className={`${buttonClass} border border-[#E2E8F0] bg-white text-[#475569]`}>Cancelar</button><button type="submit" disabled={salvando} className={`${buttonClass} text-white`} style={{ background: "var(--brand-green)" }}><UserRound size={16} />{salvando ? "Salvando…" : "Salvar usuário"}</button></div>
            </form>
          </section>
        </div>
      )}

      {modalOrganizacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setModalOrganizacao(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-modal-organizacao" className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4"><div><h2 id="titulo-modal-organizacao" className="text-lg font-bold text-brand-navy">Nova organização</h2><p className="mt-0.5 text-xs text-[#64748B]">Cadastre cliente ou fornecedor.</p></div><button aria-label="Fechar" onClick={() => setModalOrganizacao(false)} disabled={salvando} className="rounded-lg p-2 text-[#64748B] hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={salvarOrganizacao} className="space-y-4 p-6"><label className="block"><span className={labelClass}>Nome da organização</span><input className={inputClass} maxLength={160} required value={nomeOrganizacao} onChange={(event) => setNomeOrganizacao(event.target.value)} /></label><label className="block"><span className={labelClass}>Tipo</span><select className={inputClass} value={tipoOrganizacao} onChange={(event) => setTipoOrganizacao(event.target.value as OrganizacaoAdmin["tipo"])}><option value="CLIENTE">Cliente</option><option value="FORNECEDOR">Fornecedor</option></select></label><div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4"><button type="button" onClick={() => setModalOrganizacao(false)} disabled={salvando} className={`${buttonClass} border border-[#E2E8F0] bg-white text-[#475569]`}>Cancelar</button><button type="submit" disabled={salvando} className={`${buttonClass} text-white`} style={{ background: "var(--brand-green)" }}><Building2 size={16} />{salvando ? "Salvando…" : "Criar organização"}</button></div></form>
          </section>
        </div>
      )}
    </main>
  );
}
