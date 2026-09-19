export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** No default production URL and no implicit requests or authentication. */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!baseUrl) throw new Error('Configure EXPO_PUBLIC_API_URL before using the API client');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API paths must start with a single /');

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, { ...options, headers });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const error = data && typeof data === 'object' && 'error' in data ? data.error : null;
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code : 'HTTP_ERROR';
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message : 'Request failed';
    throw new ApiError(response.status, code, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
