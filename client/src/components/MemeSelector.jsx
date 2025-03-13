import { useState, useEffect } from 'react';

// Meme template options
const memeTemplates = [
    {
        id: 'lil-yachty',
        name: 'Lil Yachty Template',
        description: 'Lil Yachty walking onto stage',
        thumbnail: '/src/assets/images/lil-yachty-thumbnail.jpg'
    },
    {
        id: 'psy',
        name: 'PSY Entrance',
        description: 'PSY making a grand entrance',
        thumbnail: '/src/assets/images/psy-thumbnail.jpg'
    }
];

const MemeSelector = ({ onSelect, selectedMeme }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const response = await fetch('http://localhost:5000/meme-templates');
                const data = await response.json();

                if (data.templates && Array.isArray(data.templates)) {
                    setTemplates(data.templates);
                } else {
                    setTemplates([]);
                    setError('No templates available');
                }
            } catch (err) {
                console.error('Error fetching templates:', err);
                setError('Failed to load templates');
                // Fallback to hardcoded templates
                setTemplates([
                    {
                        id: 'lil-yachty.mp4',
                        name: 'Lil Yachty Template',
                    },
                    {
                        id: 'psy.mp4',
                        name: 'PSY Entrance',
                    }
                ]);
            } finally {
                setLoading(false);
            }
        }

        fetchTemplates();
    }, []);

    if (loading) {
        return <div className="meme-selector"><p>Loading templates...</p></div>;
    }

    return (
        <div className="meme-selector">
            <h2>Step 1: Choose a Meme Template</h2>
            {error && <p className="error-message">{error}</p>}
            <div className="meme-options">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className={`meme-option ${selectedMeme === template.id ? 'selected' : ''}`}
                        onClick={() => onSelect(template.id)}
                    >
                        <div className="meme-thumbnail">
                            {/* We'll replace with actual thumbnails later */}
                            <div className="placeholder-thumbnail">
                                {template.name.charAt(0)}
                            </div>
                        </div>
                        <div className="meme-info">
                            <h3>{template.name}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MemeSelector; 