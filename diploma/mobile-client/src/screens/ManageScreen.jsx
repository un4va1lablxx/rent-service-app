import React, { useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";

// Метаданные статусов
const STATUS_META = {
    active: { label: "Активно", color: "#34C759" },
    inactive: { label: "Снято", color: "#8E8E93" },
    pending: { label: "На модерации", color: "#FF9500" },
    rejected: { label: "Отклонено", color: "#FF3B30" },
    approved: { label: "Одобрено", color: "#34C759" }
};

const isDeletedAd = (ad) => Boolean(ad?.deleted) || (ad?.moderationStatus || "").toLowerCase() === "deleted";

const resolveAdStatus = (ad) => {
    if (isDeletedAd(ad)) return { label: "Удалено", color: "#FF3B30" };
    if (!ad.active) return STATUS_META.inactive;
    const moderationStatus = (ad.moderationStatus || "").toLowerCase();
    return STATUS_META[moderationStatus] || STATUS_META.active;
};

const hexToRgba = (hex, alpha) => {
    const normalized = String(hex || "#8E8E93").replace("#", "");
    const value = parseInt(normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenHex = (hex, amount = 28) => {
    const normalized = String(hex || "#8E8E93").replace("#", "");
    const value = parseInt(normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized, 16);
    const r = Math.max(0, ((value >> 16) & 255) - amount);
    const g = Math.max(0, ((value >> 8) & 255) - amount);
    const b = Math.max(0, (value & 255) - amount);
    return `rgb(${r}, ${g}, ${b})`;
};

export function ManageScreen({ myAds, openDraftModal, adsApi, handleToggleAdActive, handleDeleteAd, loadingMap, ListingCard }) {
    const [mode, setMode] = useState("active");

    const filteredAds = useMemo(() => (myAds || []).filter((ad) => {
        if (isDeletedAd(ad)) return false;
        return mode === "active" ? ad.active : !ad.active;
    }), [myAds, mode]);

    const renderItem = ({ item: ad }) => {
        const status = resolveAdStatus(ad);

        return (
            <View style={styles.cardContainer}>
                <ListingCard
                    ad={ad}
                    disabledOpen={false}
                    mutedMessage=""
                    showFavoriteButton={false}
                    statusBadge={
                        <View style={[
                            styles.badge,
                            {
                                backgroundColor: hexToRgba(status.color, 0.72),
                                borderColor: darkenHex(status.color),
                            }
                        ]}>
                            <Text style={styles.badgeText}>{status.label}</Text>
                        </View>
                    }
                    footer={(
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={() => handleToggleAdActive(ad)}>
                                <Text style={styles.ghostBtnText}>{ad.active ? "Снять" : "Вернуть"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.editBtn} onPress={async () => {
                                const details = await adsApi.details(ad.id);
                                openDraftModal(details);
                            }}>
                                <Pencil size={16} color="#007AFF" strokeWidth={2.2} />
                                <Text style={styles.editBtnText}>Редактировать</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAd(ad.id)} disabled={loadingMap[`delete-ad-${ad.id}`]}>
                                {loadingMap[`delete-ad-${ad.id}`] ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Trash2 size={18} color="#FF3B30" strokeWidth={2.2} />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Заголовок */}
            <View style={styles.header}>
                <Text style={styles.title}>Мои объявления</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => openDraftModal()}>
                    <Text style={styles.addButtonText}>+ Новое</Text>
                </TouchableOpacity>
            </View>

            {/* Сегментированный переключатель */}
            <View style={styles.segmented}>
                <TouchableOpacity style={[styles.segBtn, mode === "active" && styles.segBtnActive]} onPress={() => setMode("active")}>
                    <Text style={[styles.segText, mode === "active" && styles.segTextActive]}>Активные</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segBtn, mode === "archive" && styles.segBtnActive]} onPress={() => setMode("archive")}>
                    <Text style={[styles.segText, mode === "archive" && styles.segTextActive]}>В архиве</Text>
                </TouchableOpacity>
            </View>

            {/* Список объявлений */}
            <FlatList
                data={filteredAds}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>{mode === "active" ? "Нет активных объявлений" : "Архив пуст"}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F2F2F7" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
    title: { fontSize: 22, fontWeight: "700" },
    addButton: { backgroundColor: "#007AFF", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    addButtonText: { color: "#FFF", fontWeight: "600" },
    segmented: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#E5E5EA", borderRadius: 10, padding: 2, marginBottom: 12 },
    segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    segBtnActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    segText: { color: "#8E8E93", fontWeight: "600" },
    segTextActive: { color: "#1C1C1E" },
    list: { paddingBottom: 128 },
    cardContainer: { marginHorizontal: 16, marginBottom: 12 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5 },
    badgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
    actionsRow: { flexDirection: "row", marginTop: 12, gap: 8, justifyContent: "flex-end", alignItems: "center" },
    ghostBtn: { padding: 8 },
    ghostBtnText: { color: "#007AFF", fontSize: 13 },
    editBtn: { backgroundColor: "#EAF4FF", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 6 },
    editBtnText: { color: "#007AFF", fontSize: 13, fontWeight: "700" },
    deleteBtn: { backgroundColor: "#FFEAEA", padding: 9, borderRadius: 8, minWidth: 40, alignItems: "center" },
    deleteBtnText: { color: "#FFF", fontSize: 13 },
    emptyState: { alignItems: "center", marginTop: 40 },
    emptyTitle: { color: "#8E8E93", fontSize: 16 }
});
