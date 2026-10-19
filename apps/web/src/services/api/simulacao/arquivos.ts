const NOME_BANCO = "viaflux-simulacao";
const NOME_COLECAO = "anexos";

const emMemoria = new Map<string, Blob>();

function abrirBanco(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolver) => {
    const pedido = indexedDB.open(NOME_BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(NOME_COLECAO);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => resolver(null);
  });
}

function executar<T>(banco: IDBDatabase, modo: IDBTransactionMode, operacao: (colecao: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T | undefined>((resolver) => {
    const pedido = operacao(banco.transaction(NOME_COLECAO, modo).objectStore(NOME_COLECAO));
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => resolver(undefined);
  });
}

export async function guardarArquivo(id: string, conteudo: Blob) {
  emMemoria.set(id, conteudo);
  const banco = await abrirBanco();
  if (banco) await executar(banco, "readwrite", (colecao) => colecao.put(conteudo, id));
}

export async function lerArquivo(id: string): Promise<Blob | null> {
  const local = emMemoria.get(id);
  if (local) return local;
  const banco = await abrirBanco();
  if (!banco) return null;
  return ((await executar<Blob>(banco, "readonly", (colecao) => colecao.get(id))) as Blob | undefined) ?? null;
}

export function limparArquivosEmMemoria() {
  emMemoria.clear();
}
