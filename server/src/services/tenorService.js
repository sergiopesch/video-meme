const { createHttpError } = require('../utils/errors');

function pickMediaFormat(entry, keys) {
  for (const key of keys) {
    const format = entry?.media_formats?.[key];
    if (format?.url) {
      return format;
    }
  }

  return null;
}

function mapTenorResults(payload, fallbackTitle = '') {
  return (payload.results || []).map((entry) => {
    const preview = pickMediaFormat(entry, ['tinygif', 'gif']);
    const source = pickMediaFormat(entry, ['mp4', 'gif', 'tinymp4']);

    if (!preview?.url || !source?.url) {
      return null;
    }

    return {
      id: entry.id,
      title: entry.content_description || entry.title || fallbackTitle,
      previewUrl: preview.url,
      sourceUrl: source.url,
      sourceType: source.url.endsWith('.mp4') ? 'video' : 'image',
      width: Number(source.dims?.[0] || preview.dims?.[0] || 0),
      height: Number(source.dims?.[1] || preview.dims?.[1] || 0),
    };
  }).filter(Boolean);
}

async function fetchTenorCollection({ env, endpoint, query = '', limit = 12, pos = '' }) {
  if (!env.tenorApiKey) {
    throw createHttpError(503, 'GIF search is not configured yet.');
  }

  const trimmedQuery = String(query || '').trim();
  const normalizedBaseUrl = String(env.tenorApiBaseUrl || '').replace(/\/+$/, '');
  const requestUrl = new URL(`${normalizedBaseUrl}/${endpoint}`);
  requestUrl.searchParams.set('key', env.tenorApiKey);
  requestUrl.searchParams.set('client_key', env.tenorClientKey);
  requestUrl.searchParams.set('limit', String(Math.min(Math.max(Number(limit) || 12, 1), 20)));
  requestUrl.searchParams.set('contentfilter', 'medium');
  requestUrl.searchParams.set('media_filter', 'gif,tinygif,mp4,tinymp4');
  requestUrl.searchParams.set('ar_range', 'standard');
  requestUrl.searchParams.set('country', 'US');
  requestUrl.searchParams.set('locale', 'en_US');

  if (endpoint === 'search') {
    if (!trimmedQuery) {
      return {
        results: [],
        next: '',
      };
    }

    requestUrl.searchParams.set('q', trimmedQuery);
  }

  if (pos) {
    requestUrl.searchParams.set('pos', String(pos));
  }

  let response;
  try {
    response = await fetch(requestUrl);
  } catch (error) {
    throw createHttpError(502, 'GIF search is unavailable right now.', error.message);
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    const detail = responseText ? ` ${responseText.slice(0, 240)}` : '';
    throw createHttpError(502, `Tenor API returned HTTP ${response.status}.${detail}`);
  }

  const payload = await response.json();

  return {
    results: mapTenorResults(payload, trimmedQuery),
    next: payload.next || '',
  };
}

async function searchTenorGifs({ env, query, limit = 12, pos = '' }) {
  return fetchTenorCollection({
    env,
    endpoint: 'search',
    query,
    limit,
    pos,
  });
}

async function getFeaturedTenorGifs({ env, limit = 12, pos = '' }) {
  return fetchTenorCollection({
    env,
    endpoint: 'featured',
    limit,
    pos,
  });
}

module.exports = {
  getFeaturedTenorGifs,
  searchTenorGifs,
};
