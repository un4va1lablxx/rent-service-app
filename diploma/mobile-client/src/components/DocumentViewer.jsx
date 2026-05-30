import React from "react";
import { ActivityIndicator, Linking, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { X } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { assetUrl } from "../lib/api";

function fileNameFromUrl(url) {
    const raw = String(url || "").split("?")[0].split("/").pop() || "Документ";
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export function DocumentViewer({ document, onClose }) {
    if (!document?.url) return null;

    const uri = assetUrl(document.url);
    const title = document.title || fileNameFromUrl(uri);

    return (
        <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.titleBlock}>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>{uri}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Закрыть">
                        <X size={22} color="#1C1C1E" strokeWidth={2.2} />
                    </TouchableOpacity>
                </View>
                <WebView
                    source={{ uri }}
                    originWhitelist={["*"]}
                    startInLoadingState
                    renderLoading={() => (
                        <View style={styles.loader}>
                            <ActivityIndicator color="#007AFF" />
                        </View>
                    )}
                    style={styles.webView}
                />
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(uri)}>
                        <Text style={styles.secondaryButtonText}>Открыть вне приложения</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F2F2F7" },
    header: {
        minHeight: 62,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
        backgroundColor: "#FFFFFF",
    },
    titleBlock: { flex: 1 },
    title: { color: "#111113", fontSize: 17, fontWeight: "800" },
    subtitle: { color: "#8E8E93", fontSize: 11, marginTop: 2 },
    closeButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F2F2F7",
    },
    webView: { flex: 1, backgroundColor: "#FFFFFF" },
    loader: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#E5E5EA",
        backgroundColor: "#FFFFFF",
    },
    secondaryButton: {
        minHeight: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F2F2F7",
    },
    secondaryButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "800" },
});
