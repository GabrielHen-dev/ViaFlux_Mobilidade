export interface PerfilUsuario {
  codigo: string;
  descricao: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfis: PerfilUsuario[];
}

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  usuario: UsuarioAutenticado;
}
