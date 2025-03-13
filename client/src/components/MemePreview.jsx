import { useState, useEffect } from 'react';

const MemePreview = ({ memeUrl }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Create the full URL by prepending the server base URL
    const fullMemeUrl = memeUrl.startsWith('http')
        ? memeUrl
        : `http://localhost:5000${memeUrl}`;

    // Log the URL for debugging
    useEffect(() => {
        console.log('Meme URL:', memeUrl);
        console.log('Full Meme URL:', fullMemeUrl);

        // Reset error state when URL changes
        setVideoError(false);
    }, [memeUrl, fullMemeUrl]);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            // Fetch the video file
            const response = await fetch(fullMemeUrl);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();

            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'my-video-meme.mp4';

            // Trigger the download
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            alert(`Download failed: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = () => {
        // In a real app, this would integrate with social media sharing APIs
        if (navigator.share) {
            navigator.share({
                title: 'My Video Meme',
                text: 'Check out this meme I created!',
                url: fullMemeUrl,
            })
                .catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support the Web Share API
            navigator.clipboard.writeText(fullMemeUrl)
                .then(() => alert('Link copied to clipboard!'))
                .catch((err) => console.error('Could not copy text: ', err));
        }
    };

    const handleVideoError = (e) => {
        console.error('Video error:', e);
        setVideoError(true);
    };

    return (
        <div className="meme-preview">
            <h2>Your Generated Meme</h2>

            <div className="video-container">
                {videoError ? (
                    <div className="video-error">
                        <p>Error loading video. Please try refreshing the page.</p>
                        <p>URL: {fullMemeUrl}</p>
                    </div>
                ) : (
                    <video
                        src={fullMemeUrl}
                        controls
                        autoPlay
                        loop
                        className="meme-video"
                        onError={handleVideoError}
                    />
                )}
            </div>

            <div className="action-buttons">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading || videoError}
                    className="download-button"
                >
                    {isDownloading ? 'Downloading...' : 'Download'}
                </button>

                <button
                    onClick={handleShare}
                    className="share-button"
                    disabled={videoError}
                >
                    Share
                </button>
            </div>

            <div className="debug-info">
                <details>
                    <summary>Debug Info</summary>
                    <p>URL: {memeUrl}</p>
                    <p>Full URL: {fullMemeUrl}</p>
                    <button onClick={() => window.open(`http://localhost:5000/check-file/${memeUrl.split('/').pop()}`)}>
                        Check File Status
                    </button>
                </details>
            </div>
        </div>
    );
};

export default MemePreview; 