import { useEffect, useState } from "react";
import { storage } from "../lib/api";

const MAX_AD_IMAGES = 35;

export default function ImageUploader({ existingImages = [], onImagesUploaded }) {
    const [images, setImages] = useState(existingImages);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setImages(existingImages);
    }, [existingImages]);

    const handleFileChange = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) {
            return;
        }

        const remainingSlots = Math.max(0, MAX_AD_IMAGES - images.length);
        if (remainingSlots === 0) {
            event.target.value = "";
            return;
        }

        setUploading(true);
        const formData = new FormData();
        files.slice(0, remainingSlots).forEach((file) => {
            formData.append("files", file);
        });

        try {
            const response = await fetch("http://localhost:8080/api/upload/photos", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${storage.getToken()}`
                },
                body: formData
            });

            if (!response.ok) {
                console.error("Upload failed:", response.status);
                return;
            }

            const urls = await response.json();
            const nextImages = [...images, ...urls].slice(0, MAX_AD_IMAGES);
            setImages(nextImages);
            onImagesUploaded(nextImages);
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const removeImage = (indexToRemove) => {
        const nextImages = images.filter((_, index) => index !== indexToRemove);
        setImages(nextImages);
        onImagesUploaded(nextImages);
    };

    const moveImage = (fromIndex, toIndex) => {
        if (fromIndex === toIndex || toIndex < 0 || toIndex >= images.length) {
            return;
        }

        const nextImages = [...images];
        const [moved] = nextImages.splice(fromIndex, 1);
        nextImages.splice(toIndex, 0, moved);
        setImages(nextImages);
        onImagesUploaded(nextImages);
    };

    return (
        <div className="image-uploader">
            <div className="image-preview-grid">
                {images.map((url, index) => (
                    <div
                        key={`${url}-${index}`}
                        className="image-preview"
                        draggable
                        onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", String(index));
                            event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                            moveImage(fromIndex, index);
                        }}
                    >
                        <img src={url} alt={`Фото ${index + 1}`} />
                        <button type="button" className="remove-image" onClick={() => removeImage(index)}>×</button>
                    </div>
                ))}
                <label className={`upload-button ${uploading ? "uploading" : ""} ${images.length >= MAX_AD_IMAGES ? "disabled" : ""}`}>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading || images.length >= MAX_AD_IMAGES}
                    />
                    {uploading ? "…" : "+"}
                </label>
            </div>
        </div>
    );
}
