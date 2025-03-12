import { useRef, useState } from 'react';

const ImageUploader = ({ onUpload, hasImage }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                processFile(file);
            }
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result);
            onUpload(file);
        };
        reader.readAsDataURL(file);
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="image-uploader">
            <h2>Step 2: Upload Your Face Image</h2>

            <div
                className={`upload-area ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-image' : ''}`}
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {previewUrl ? (
                    <div className="image-preview">
                        <img src={previewUrl} alt="Preview" />
                    </div>
                ) : (
                    <div className="upload-prompt">
                        <div className="upload-icon">📷</div>
                        <p>Click to browse or drag an image here</p>
                        <span className="file-hint">JPG, PNG, or GIF • Max 5MB</span>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            {previewUrl && (
                <button
                    className="change-image-btn"
                    onClick={triggerFileInput}
                >
                    Change Image
                </button>
            )}
        </div>
    );
};

export default ImageUploader; 