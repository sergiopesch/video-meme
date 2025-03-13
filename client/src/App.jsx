import { useState, useEffect } from 'react'
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
  const [processingMethod, setProcessingMethod] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Check if Segmind AI is available
  useEffect(() => {
    async function checkAIStatus() {
      try {
        const response = await fetch('http://localhost:5000/ai-status');
        const data = await response.json();
        setAiAvailable(data.available);
        console.log('AI API status:', data.message);
      } catch (err) {
        console.error('Error checking AI status:', err);
        setAiAvailable(false);
      }
    }

    checkAIStatus();
  }, []);

  // Simulate progress to give user feedback during long processes
  useEffect(() => {
    let interval;

    if (isLoading) {
      setProcessingProgress(0);

      // Simulate progress - Wan2.1 is slower so we use a longer time estimate
      const totalTime = aiAvailable ? 120000 : 30000; // 2 minutes for Wan2.1, 30 seconds for fallbacks
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          // Cap at 95% until we get actual completion
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + (100 / (totalTime / 1000));
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoading, aiAvailable]);

  const handleMemeSelect = (meme) => {
    setSelectedMeme(meme);
    setGeneratedMeme(null);
    setProcessingMethod(null);
  };

  const handleImageUpload = (image) => {
    setUserImage(image);
    setGeneratedMeme(null);
    setProcessingMethod(null);
  };

  const generateMeme = async () => {
    if (!selectedMeme || !userImage) {
      setError('Please select a meme template and upload your image');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append('template', selectedMeme);
      formData.append('image', userImage);

      // Add settings as JSON string
      const settings = {
        // Default settings if needed
      };
      formData.append('settings', JSON.stringify(settings));

      const response = await fetch('http://localhost:5000/generate-meme', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract detailed error message from the server response if available
        const errorMessage = data.details || data.error || 'Failed to generate meme';
        throw new Error(errorMessage);
      }

      setGeneratedMeme(data.url);
      setProcessingMethod(data.method || 'unknown');
      setProcessingProgress(100);
    } catch (err) {
      console.error('Error generating meme:', err);
      // Check for common API errors
      let errorMsg = err.message;
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        errorMsg = 'API key is invalid or missing. Please check your Segmind API key in the server/.env file.';
      } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        errorMsg = 'API rate limit exceeded. Please try again later.';
      }
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get processing method description
  const getProcessingDescription = () => {
    if (!processingMethod) return '';

    switch (processingMethod) {
      case 'segmind':
        return 'using Segmind AI for realistic video animation';
      case 'ffmpeg':
        return 'using basic image overlay';
      default:
        return '';
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Video Meme Generator</h1>
        <p>Create your own Lil Yachty or PSY entrance meme!</p>
        {aiAvailable && (
          <div className="wan21-badge">
            <span className="badge">Segmind AI Enabled</span>
          </div>
        )}
      </header>

      <main>
        <div className="meme-creation-container">
          <MemeSelector onSelect={handleMemeSelect} selectedMeme={selectedMeme} />

          <ImageUploader onUpload={handleImageUpload} />

          <button
            onClick={generateMeme}
            disabled={!selectedMeme || !userImage || isLoading}
            className="generate-button"
          >
            {isLoading ? 'Generating Meme...' : 'Generate Meme'}
          </button>

          {error && <div className="error-message">{error}</div>}

          {isLoading && (
            <div className="loading-message">
              <p>
                {aiAvailable
                  ? 'Please wait while we generate your meme with Segmind AI. This process may take 1-2 minutes as we create realistic video movement.'
                  : 'Processing your meme. This should take less than a minute.'}
              </p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">{Math.round(processingProgress)}% Complete</p>
            </div>
          )}
        </div>

        {generatedMeme && (
          <>
            <MemePreview memeUrl={generatedMeme} />
            {processingMethod && (
              <div className="processing-info">
                <p>Meme generated successfully {getProcessingDescription()}</p>
              </div>
            )}
          </>
        )}
      </main>

      <footer>
        <p>© 2025 Video Meme Generator | Created by Sergio Peschiera</p>
      </footer>
    </div>
  )
}

export default App
