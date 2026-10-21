export interface PerfilUsuario {
  codigo: string;
  descricao: string;
}

export interface OrganizacaoUsuario {
  id: string;
  nome: string;
  tipo: "CLIENTE" | "FORNECEDOR";
}

export interface DepartamentoUsuario {
  codigo: string;
  nome: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfis: PerfilUsuario[];
  organizacao?: OrganizacaoUsuario | null;
  departamentos?: DepartamentoUsuario[];
}

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  usuario: UsuarioAutenticado;
}
