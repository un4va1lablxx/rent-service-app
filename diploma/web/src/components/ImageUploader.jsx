import { useState } from 'react';
import { storage } from '../lib/api';

export default function ImageUploader({ existingImages = [], onImagesUploaded }) {
    const [images, setImages] = useState(existingImages);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('http://localhost:8080/api/upload/photos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${storage.getToken()}`
                },
                body: formData
            });

            if (response.ok) {
                const urls = await response.json();
                const newImages = [...images, ...urls];
                setImages(newImages);
                onImagesUploaded(newImages);
            } else {
                console.error('Upload failed:', response.status);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = (indexToRemove) => {
        const newImages = images.filter((_, i) => i !== indexToRemove);
        setImages(newImages);
        onImagesUploaded(newImages);
    };

    return (
        <div className="image-uploader">
            <div className="image-preview-grid">
                {images.map((url, idx) => (
                    <div key={idx} className="image-preview">
                        <img src={url} alt={`Фото ${idx + 1}`} />
                        <button type="button" className="remove-image" onClick={() => removeImage(idx)}>×</button>
                    </div>
                ))}
                <label className={`upload-button ${uploading ? 'uploading' : ''}`}>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {uploading ? '⏳' : '+'}
                </label>
            </div>
        </div>
    );
}