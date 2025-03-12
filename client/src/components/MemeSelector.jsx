import { useState } from 'react';

// Meme template options
const memeTemplates = [
    {
        id: 'jensen',
        name: 'Jensen Huang Walking',
        description: 'NVIDIA CEO Jensen Huang walking onto stage',
        thumbnail: '/src/assets/images/jensen-thumbnail.jpg'
    },
    {
        id: 'psy',
        name: 'PSY Entrance',
        description: 'PSY making a grand entrance',
        thumbnail: '/src/assets/images/psy-thumbnail.jpg'
    }
];

const MemeSelector = ({ onSelect, selectedMeme }) => {
    return (
        <div className="meme-selector">
            <h2>Step 1: Choose a Meme Template</h2>
            <div className="meme-options">
                {memeTemplates.map((template) => (
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
                            <p>{template.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MemeSelector; 