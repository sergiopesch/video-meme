import { useState } from 'react';
import { apiFetch } from '../lib/api';

const quickSearches = ['funny', 'cat', 'reaction', 'celebration', 'fail'];

const GifSearch = ({ featured = [], onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = async (nextQuery) => {
    const trimmedQuery = String(nextQuery || query).trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiFetch(`/api/gifs/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'GIF search is unavailable.');
      }

      setResults(payload.results || []);
    } catch (searchError) {
      setResults([]);
      setError(searchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel-section">
      <div className="search-row">
        <input
          className="search-input"
          type="search"
          placeholder="Search Tenor"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              runSearch();
            }
          }}
        />
        <button type="button" className="secondary-button search-button" onClick={() => runSearch()}>
          Search
        </button>
      </div>

      <div className="quick-searches">
        {quickSearches.map((term) => (
          <button
            key={term}
            type="button"
            className="chip-button"
            onClick={() => {
              setQuery(term);
              runSearch(term);
            }}
          >
            {term}
          </button>
        ))}
      </div>

      {error && <p className="support-copy">{error}</p>}

      <div className="gif-results">
        {isLoading ? (
          <div className="gif-result-placeholder">Searching…</div>
        ) : (results.length ? results : featured).map((item) => (
          <button
            key={item.id}
            type="button"
            className="gif-result-card"
            onClick={() => onSelect(item)}
          >
            <img src={item.previewUrl} alt={item.title} className="gif-result-image" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
};

export default GifSearch;
