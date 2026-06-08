import React, { useState, useCallback } from "react";
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function FavoritesScreen({
                                    favorites,
                                    setSelectedTab,
                                    loadingMap,
                                    setSelectedAdId,
                                    favoriteStatusMap,
                                    favoriteIds,
                                    handleToggleFavorite,
                                    ListingCard,
                                    onRefreshFavorites // Рекомендуется прокинуть этот метод из родительского хука для обновления данных
                                }) {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    // Фильтрация валидных объявлений
    const visibleFavorites = (favorites || []).filter(
        (item) =>
            item?.ad &&
            !item.ad.deleted &&
            (item.ad.moderationStatus || "").toLowerCase() !== "deleted"
    );

    // Обработчик Pull-to-Refresh
    const handleRefresh = useCallback(async () => {
        if (!onRefreshFavorites) return;
        setRefreshing(true);
        try {
            await onRefreshFavorites();
        } catch (error) {
            console.error("Ошибка обновления избранного:", error);
        } finally {
            setRefreshing(false);
        }
    }, [onRefreshFavorites]);

    // Рендеринг отдельной карточки в списке
    const renderItem = useCallback(({ item }) => {
        const isUnavailable = !item.ad.active || item.ad.moderationStatus !== "approved";

        return (
            <View style={styles.cardWrapper}>
                <ListingCard
                    ad={item.ad}
                    onOpen={setSelectedAdId}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favoriteIds.has(item.adId) || favoriteStatusMap[item.adId]}
                    loading={loadingMap[`favorite-${item.adId}`]}
                    mutedMessage={isUnavailable ? "Объявление снято с публикации" : ""}
                    disabledOpen={isUnavailable}
                    mediaMuted={isUnavailable}
                />
                {false && isUnavailable && (
                    <View style={styles.unavailableOverlay}>
                        <View style={styles.unavailableBadge}>
                            <Text style={styles.unavailableBadgeText}>Неактивно</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }, [favoriteIds, favoriteStatusMap, loadingMap, handleToggleFavorite, setSelectedAdId, ListingCard]);

    // Кастомный компонент пустой заглушки (Empty State)
    const renderEmptyState = () => (
        <View style={[styles.emptyContainer, styles.glass]}>
            {/* Иконка Сердца (Нативный минималистичный аналог SVG) */}
            <View style={styles.iconContainer}>
                <View style={styles.heartIconLeft} />
                <View style={styles.heartIconRight} />
            </View>

            <Text style={styles.emptyTitle}>Избранное пока пусто</Text>
            <Text style={styles.emptySubtitle}>
                Добавляйте понравившиеся объявления в избранное, чтобы не потерять их.
            </Text>

            <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={() => setSelectedTab("discover")}
            >
                <Text style={styles.primaryButtonText}>Перейти к объявлениям</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Заголовок экрана */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Избранное</Text>
                {visibleFavorites.length > 0 && (
                    <Text style={styles.headerCounter}>{visibleFavorites.length}</Text>
                )}
            </View>

            {/* Основной список */}
            <FlatList
                data={visibleFavorites}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[
                    styles.listContent,
                    visibleFavorites.length === 0 && styles.listEmptyContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 128 }
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#007AFF"
                        colors={["#007AFF"]}
                    />
                }
            />
        </View>
    );
}

// ==========================================
// СТИЛИЗАЦИЯ ДЛЯ PRODUCTION-ОКРУЖЕНИЯ
// ==========================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7", // Стандартный системный фон iOS/Android
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 4,
        gap: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1C1C1E",
        letterSpacing: 0.36,
    },
    headerCounter: {
        fontSize: 16,
        fontWeight: "600",
        color: "#8E8E93",
        backgroundColor: "#E5E5EA",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: "hidden",
        alignSelf: "flex-end",
        marginBottom: 4,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 0,
    },
    listEmptyContent: {
        flex: 1,
        justifyContent: "center",
    },
    cardWrapper: {
        width: "100%",
        marginBottom: 16,
        position: "relative",
    },
    cardMuted: {
        opacity: 0.65, // Смягчаем визуальный приоритет неактивного объявления
    },
    unavailableOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        padding: 12,
        pointerEvents: "none", // Пропускает тапы сквозь себя к оверлею если нужно
    },
    unavailableBadge: {
        backgroundColor: "#FF3B30",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    unavailableBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },

    // Оформление пустого экрана (Glass State)
    glass: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 4,
    },
    emptyContainer: {
        width: "100%",
        alignItems: "center",
        paddingVertical: 36,
    },
    iconContainer: {
        width: 72,
        height: 72,
        backgroundColor: "#FFEAEA",
        borderRadius: 36,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        position: "relative",
    },
    // Рисуем аккуратное сердце кодом, если нет внешней библиотеки иконок
    heartIconLeft: {
        position: "absolute",
        width: 20,
        height: 32,
        backgroundColor: "#FF3B30",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        transform: [{ rotate: "-45deg" }],
        left: 20,
        top: 18,
    },
    heartIconRight: {
        position: "absolute",
        width: 20,
        height: 32,
        backgroundColor: "#FF3B30",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        transform: [{ rotate: "45deg" }],
        right: 20,
        top: 18,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1C1C1E",
        textAlign: "center",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#8E8E93",
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    primaryButton: {
        width: "100%",
        height: 48,
        backgroundColor: "#007AFF",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
});
