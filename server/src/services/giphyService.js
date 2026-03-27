const { createHttpError } = require('../utils/errors');

function mapGiphyItem(entry) {
  const preview = entry?.images?.fixed_width_small_still || entry?.images?.fixed_width_still;
  const animated = entry?.images?.original || entry?.images?.downsized || entry?.images?.fixed_width;
  const mp4 = animated?.mp4;
  const gif = animated?.url;
  const previewUrl = preview?.url || animated?.url;
  const sourceUrl = mp4 || gif;

  if (!previewUrl || !sourceUrl) {
    return null;
  }

  return {
    id: entry.id,
    title: entry.title || entry.slug || 'GIF',
    previewUrl,
    sourceUrl,
    sourceType: mp4 ? 'video' : 'image',
    width: Number(animated?.width || preview?.width || 0),
    height: Number(animated?.height || preview?.height || 0),
  };
}

async function fetchGiphyCollection({ env, endpoint, query = '', limit = 12, offset = 0 }) {
  if (!env.giphyApiKey) {
    throw createHttpError(503, 'GIF search is not configured yet.');
  }

  const normalizedBaseUrl = String(env.giphyApiBaseUrl || '').replace(/\/+$/, '');
  const requestUrl = new URL(`${normalizedBaseUrl}/${endpoint}`);
  requestUrl.searchParams.set('api_key', env.giphyApiKey);
  requestUrl.searchParams.set('limit', String(Math.min(Math.max(Number(limit) || 12, 1), 20)));
  requestUrl.searchParams.set('offset', String(Math.max(Number(offset) || 0, 0)));
  requestUrl.searchParams.set('rating', 'g');
  requestUrl.searchParams.set('bundle', 'messaging_non_clips');

  if (endpoint === 'search') {
    const trimmedQuery = String(query || '').trim();
    if (!trimmedQuery) {
      return {
        results: [],
        next: '',
      };
    }

    requestUrl.searchParams.set('q', trimmedQuery);
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
    throw createHttpError(502, `GIPHY API returned HTTP ${response.status}.${detail}`);
  }

  const payload = await response.json();
  const count = Array.isArray(payload.data) ? payload.data.length : 0;

  return {
    results: (payload.data || []).map(mapGiphyItem).filter(Boolean),
    next: count ? String((Number(offset) || 0) + count) : '',
  };
}

async function searchGifs({ env, query, limit = 12, pos = '' }) {
  return fetchGiphyCollection({
    env,
    endpoint: 'search',
    query,
    limit,
    offset: Number(pos) || 0,
  });
}

async function getFeaturedGifs({ env, limit = 12, pos = '' }) {
  return fetchGiphyCollection({
    env,
    endpoint: 'trending',
    limit,
    offset: Number(pos) || 0,
  });
}

module.exports = {
  getFeaturedGifs,
  searchGifs,
};
