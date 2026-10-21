export type Transporte = (url: string, init: RequestInit) => Promise<Response>;

export const transportar: Transporte = (url, init) => fetch(url, init);
