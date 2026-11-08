/** Append the already encoded bridge query without replacing Vite's own query. */
export const withRuntimeQuery = (url: string, query: string) => `${url}${url.includes('?') ? '&' : '?'}${query}`;
