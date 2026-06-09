import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { API_BASE_URL, assetUrl, storage } from "../lib/api";

const MAX_AD_IMAGES = 35;

export default function ImageUploader({ existingImages = [], onImagesUploaded }) {
    const [images, setImages] = useState(existingImages);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setImages(existingImages || []);
    }, [existingImages]);

    const handlePickImages = async () => {
        const remainingSlots = Math.max(0, MAX_AD_IMAGES - images.length);
        if (remainingSlots === 0 || uploading) return;

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Нет доступа", "Разрешите доступ к фото, чтобы загрузить изображения.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remainingSlots,
            quality: 0.9,
        });

        if (result.canceled || !result.assets?.length) return;

        setUploading(true);
        const formData = new FormData();

        const normalizedAssets = await Promise.all(result.assets.slice(0, remainingSlots).map(async (asset, index) => {
            const name = asset.fileName || `photo_${Date.now()}_${index}.jpg`;
            const isHeic = /\.(heic|heif)$/i.test(name) || /heic|heif/i.test(asset.mimeType || "");
            if (!isHeic) return { ...asset, uploadName: name, uploadType: asset.mimeType || "image/jpeg" };

            const converted = await ImageManipulator.manipulateAsync(asset.uri, [], {
                compress: 0.92,
                format: ImageManipulator.SaveFormat.JPEG,
            });
            return {
                ...asset,
                uri: converted.uri,
                uploadName: name.replace(/\.(heic|heif)$/i, ".jpg"),
                uploadType: "image/jpeg",
            };
        }));

        normalizedAssets.forEach((asset, index) => {
            formData.append("files", {
                uri: asset.uri,
                type: asset.uploadType || "image/jpeg",
                name: asset.uploadName || `photo_${Date.now()}_${index}.jpg`,
            });
        });

        try {
            const token = await storage.getToken();
            const response = await fetch(`${API_BASE_URL}/api/upload/photos`, {
                method: "POST",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData
            });

            if (!response.ok) {
                Alert.alert("Не удалось загрузить фото", `Сервер вернул ${response.status}.`);
                return;
            }

            const urls = await response.json();
            const normalizedUrls = (Array.isArray(urls) ? urls : [urls]).map(assetUrl);
            const nextImages = [...images.map(assetUrl), ...normalizedUrls].slice(0, MAX_AD_IMAGES);
            setImages(nextImages);
            onImagesUploaded?.(nextImages);
        } catch (error) {
            Alert.alert("Не удалось загрузить фото", error.message || "Попробуйте еще раз.");
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (indexToRemove) => {
        const nextImages = images.filter((_, index) => index !== indexToRemove).map(assetUrl);
        setImages(nextImages);
        onImagesUploaded?.(nextImages);
    };

    const moveImage = (fromIndex, toIndex) => {
        if (fromIndex === toIndex || toIndex < 0 || toIndex >= images.length) return;
        const nextImages = images.map(assetUrl);
        const [moved] = nextImages.splice(fromIndex, 1);
        nextImages.splice(toIndex, 0, moved);
        setImages(nextImages);
        onImagesUploaded?.(nextImages);
    };

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {images.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.imageWrapper}>
                        <Image source={{ uri: assetUrl(url) }} style={styles.image} />
                        <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                            <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                        {false && <View style={styles.sortControls}>
                            {index > 0 && (
                                <TouchableOpacity style={styles.sortArrow} onPress={() => moveImage(index, index - 1)}>
                                    <Text style={styles.arrowText}>‹</Text>
                                </TouchableOpacity>
                            )}
                            {index < images.length - 1 && (
                                <TouchableOpacity style={styles.sortArrow} onPress={() => moveImage(index, index + 1)}>
                                    <Text style={styles.arrowText}>›</Text>
                                </TouchableOpacity>
                            )}
                        </View>}
                    </View>
                ))}

                {images.length < MAX_AD_IMAGES && (
                    <TouchableOpacity
                        style={[styles.uploadButton, uploading && styles.disabledButton]}
                        onPress={handlePickImages}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                            <>
                                <Text style={styles.uploadButtonText}>+</Text>
                                <Text style={styles.uploadHint}>Фото</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: "100%", marginVertical: 10 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    imageWrapper: {
        width: 92,
        height: 92,
        borderRadius: 12,
        position: "relative",
        backgroundColor: "#F2F2F7",
        overflow: "hidden",
    },
    image: { width: "100%", height: "100%", resizeMode: "cover" },
    removeButton: {
        position: "absolute",
        top: 5,
        right: 5,
        backgroundColor: "rgba(0,0,0,0.58)",
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    removeButtonText: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: -2 },
    sortControls: {
        position: "absolute",
        bottom: 5,
        left: 5,
        right: 5,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    sortArrow: {
        backgroundColor: "rgba(255,255,255,0.88)",
        width: 26,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
    },
    arrowText: { color: "#111", fontSize: 17, fontWeight: "800", marginTop: -2 },
    uploadButton: {
        width: 92,
        height: 92,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#007AFF",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F7FBFF",
    },
    uploadButtonText: { color: "#007AFF", fontSize: 30, fontWeight: "500", lineHeight: 32 },
    uploadHint: { color: "#007AFF", fontSize: 12, fontWeight: "700" },
    disabledButton: { borderColor: "#C6C6C8", backgroundColor: "#F2F2F7" }
});
