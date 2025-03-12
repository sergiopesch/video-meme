import { useState } from 'react'
import './App.css'
import MemeSelector from './components/MemeSelector'
import ImageUploader from './components/ImageUploader'
import MemePreview from './components/MemePreview'

function App() {
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [generatedMeme, setGeneratedMeme] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMemeSelect = (meme) => {
    setSelectedMeme(meme);
    setGeneratedMeme(null);
  };

  const handleImageUpload = (image) => {
    setUserImage(image);
    setGeneratedMeme(null);
  };

  const generateMeme = async () => {
    if (!selectedMeme || !userImage) {
      setError('Please select a meme template and upload your image');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('memeType', selectedMeme);
      formData.append('userImage', userImage);

      const response = await fetch('http://localhost:5000/api/generate-meme', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate meme');
      }

      const data = await response.json();
      setGeneratedMeme(data.memeUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Video Meme Generator</h1>
        <p>Create your own Jensen or PSY entrance meme!</p>
      </header>

      <main>
        <div className="meme-creation-container">
          <MemeSelector onSelect={handleMemeSelect} selectedMeme={selectedMeme} />

          <ImageUploader onUpload={handleImageUpload} hasImage={!!userImage} />

          <button
            onClick={generateMeme}
            disabled={!selectedMeme || !userImage || isLoading}
            className="generate-button"
          >
            {isLoading ? 'Generating...' : 'Generate Meme'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        {generatedMeme && (
          <MemePreview memeUrl={generatedMeme} />
        )}
      </main>

      <footer>
        <p>© 2025 Video Meme Generator | Created by Sergio Peschiera</p>
      </footer>
    </div>
  )
}

export default App
