import { useState } from 'react';

const MemePreview = ({ memeUrl }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            // Fetch the video file
            const response = await fetch(memeUrl);
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
                url: memeUrl,
            })
                .catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for browsers that don't support the Web Share API
            navigator.clipboard.writeText(memeUrl)
                .then(() => alert('Link copied to clipboard!'))
                .catch((err) => console.error('Could not copy text: ', err));
        }
    };

    return (
        <div className="meme-preview">
            <h2>Your Generated Meme</h2>

            <div className="video-container">
                <video
                    src={memeUrl}
                    controls
                    autoPlay
                    loop
                    className="meme-video"
                />
            </div>

            <div className="action-buttons">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="download-button"
                >
                    {isDownloading ? 'Downloading...' : 'Download'}
                </button>

                <button
                    onClick={handleShare}
                    className="share-button"
                >
                    Share
                </button>
            </div>
        </div>
    );
};

export default MemePreview; 