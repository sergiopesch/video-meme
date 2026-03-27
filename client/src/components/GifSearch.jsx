import { useState } from 'react';
import { apiFetch } from '../lib/api';

const quickSearches = ['funny', 'cat', 'reaction', 'celebration', 'fail'];

const GifSearch = ({ featured = [], error: discoveryError = '', onSelect, selectedSourceUrl = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = async (nextQuery) => {
    const trimmedQuery = String(nextQuery || query).trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setSearchError('');

    try {
      const response = await apiFetch(`/api/gifs/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'GIF search is unavailable.');
      }

      setResults(payload.results || []);
    } catch (searchError) {
      setResults([]);
      setSearchError(searchError.message);
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
          placeholder="Search Gif"
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

      {(searchError || discoveryError) && <p className="support-copy">{searchError || discoveryError}</p>}

      <div className="gif-results">
        {isLoading ? (
          <div className="gif-result-placeholder">Searching…</div>
        ) : (results.length ? results : featured).length ? (
          (results.length ? results : featured).map((item) => {
            const isSelected = selectedSourceUrl && selectedSourceUrl === item.sourceUrl;

            return (
            <button
              key={item.id}
              type="button"
              className={`gif-result-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(item)}
              aria-pressed={isSelected}
            >
              <img src={item.previewUrl} alt={item.title} className="gif-result-image" loading="lazy" />
              {isSelected && <span className="gif-selected-badge">Selected</span>}
            </button>
            );
          })
        ) : (
          <div className="gif-result-placeholder">No GIFs yet.</div>
        )}
      </div>
    </section>
  );
};

export default GifSearch;
