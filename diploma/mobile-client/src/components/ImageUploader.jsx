import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
// Подключаем библиотеку для выбора изображений (выберите её при сборке проекта)
// Установка: npm install react-native-image-picker
import { launchImageLibrary } from "react-native-image-picker";
import { storage } from "../lib/api";

const MAX_AD_IMAGES = 35;

export default function ImageUploader({ existingImages = [], onImagesUploaded }) {
    const [images, setImages] = useState(existingImages);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setImages(existingImages);
    }, [existingImages]);

    // Функция выбора картинок из галереи смартфона
    const handlePickImages = async () => {
        const remainingSlots = Math.max(0, MAX_AD_IMAGES - images.length);
        if (remainingSlots === 0) return;

        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: remainingSlots, // Ограничиваем выбор доступным остатком слотов
        });

        if (result.didCancel || !result.assets || result.assets.length === 0) {
            return;
        }

        setUploading(true);
        const formData = new FormData();

        // Формируем файлы под нативный формат FormData
        result.assets.forEach((asset) => {
            formData.append("files", {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || `photo_${Date.now()}.jpg`,
            });
        });

        try {
            const response = await fetch("http://localhost:8080/api/upload/photos", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${storage.getToken()}`,
                    // В React Native fetch сам выставит нужный multipart/form-data boundary, Content-Type указывать не нужно
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
        <View style={styles.container}>
            <View style={styles.grid}>
                {images.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.imageWrapper}>
                        {/* Картинка в React Native требует объект { uri: url } */}
                        <Image source={{ uri: url }} style={styles.image} />

                        {/* Кнопка удаления */}
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeImage(index)}
                        >
                            <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>

                        {/* Нативные стрелочки сортировки вместо Drag&Drop */}
                        <View style={styles.sortControls}>
                            {index > 0 && (
                                <TouchableOpacity
                                    style={styles.sortArrow}
                                    onPress={() => moveImage(index, index - 1)}
                                >
                                    <Text style={styles.arrowText}>‹</Text>
                                </TouchableOpacity>
                            )}
                            {index < images.length - 1 && (
                                <TouchableOpacity
                                    style={styles.sortArrow}
                                    onPress={() => moveImage(index, index + 1)}
                                >
                                    <Text style={styles.arrowText}>›</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {/* Кнопка добавления новых фото */}
                {images.length < MAX_AD_IMAGES && (
                    <TouchableOpacity
                        style={[styles.uploadButton, uploading && styles.disabledButton]}
                        onPress={handlePickImages}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                            <Text style={styles.uploadButtonText}>+</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    imageWrapper: {
        width: 90,
        height: 90,
        borderRadius: 8,
        position: 'relative',
        backgroundColor: '#eee',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: -2,
    },
    sortControls: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        right: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sortArrow: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        width: 22,
        height: 18,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: -2,
    },
    uploadButton: {
        width: 90,
        height: 90,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    uploadButtonText: {
        color: '#007AFF',
        fontSize: 32,
        fontWeight: '300',
    },
    disabledButton: {
        borderColor: '#ccc',
        backgroundColor: '#eaeaea',
    }
});