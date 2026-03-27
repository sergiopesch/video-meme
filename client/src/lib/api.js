export function trimTrailingSlash(value = '') {
  return String(value).replace(/\/+$/, '');
}

export function resolveApiBaseUrl(configuredBaseUrl, fallbackOrigin = '') {
  const configured = trimTrailingSlash(configuredBaseUrl);

  if (configured) {
    return configured;
  }

  return trimTrailingSlash(fallbackOrigin);
}

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return resolveApiBaseUrl(configuredBaseUrl, fallbackOrigin);
}

export function buildApiUrl(path, baseUrl = getApiBaseUrl()) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export async function apiFetch(path, options) {
  return fetch(buildApiUrl(path), options);
}
