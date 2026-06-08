import React, { useMemo, useState } from "react";
import {
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import {
    SafeAreaView,
    SafeAreaProvider,
} from "react-native-safe-area-context";
import { Bell, Heart, Home, LogOut, MessageCircle, Plus, ShieldCheck, UserRound } from "lucide-react-native";

// Импорт всех необходимых модулей и зависимостей
import ImageUploader from "./src/components/ImageUploader.jsx";
import AddressInput from "./src/components/AddressInput.jsx";
import {
    adminApi,
    adsApi,
    authApi,
    bookingsApi,
    favoritesApi,
    messagesApi,
    notificationsApi,
    reviewsApi,
    storage,
    uploadApi,
    usersApi,
    verificationApi,
    assetUrl
} from "./src/lib/api";
import { initialDraft, navItems, propertyOptions, roomOptions } from "./src/shared/appConstants";
import { Field, Metric, Modal, Icon } from "./src/components/ui";
import { DetailsModal, ListingCard } from "./src/components/listings/ListingComponents";
import { renderChatMessage } from "./src/components/messages/chatRendering";
import { fallbackImage, formatMoney, formatPriceWithType, propertyLabel, roleLabel, statusLabel } from "./src/shared/formatters";
import {
    autoResizeTextarea,
    dialogKey,
    groupMessagesByDay,
    normalizeInteger,
    normalizeNumber
} from "./src/shared/formUtils";

// Экран загрузки и авторизации
import { BootScreen } from "./src/screens/BootScreen";
import { AuthScreen } from "./src/screens/AuthScreen";

// Экраны вкладок
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { FavoritesScreen } from "./src/screens/FavoritesScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { ManageScreen } from "./src/screens/ManageScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AdminScreen } from "./src/screens/AdminScreen";

import { AppModals } from "./src/components/app/AppModals";
import { DocumentViewer } from "./src/components/DocumentViewer.jsx";
import { useRentServiceApp } from "./src/app/useRentServiceApp";

const tabIconMap = {
    discover: Home,
    favorites: Heart,
    messages: MessageCircle,
    manage: Plus,
    profile: UserRound,
    admin: ShieldCheck,
};

export default function App() {
    const appState = useRentServiceApp();
    const {
        bootstrapping,
        profile,
        visibleNavItems,
        selectedTab,
        setSelectedTab,
        setActiveDialogKey,
        activeDialogKey,
        unreadCount,
        notifications,
        notificationsUnread,
        notificationsOpen,
        setNotificationsOpen,
        markNotificationRead,
        removeNotification,
        clearNotifications,
        handleLogout,
        isLandlord,
        isAdmin,
        notice,
        setNotice,
        error,
        setError
    } = appState;

    const [expandedNotificationId, setExpandedNotificationId] = useState(null);
    const [documentViewer, setDocumentViewer] = useState(null);
    const showBottomTabs = selectedTab !== "messages" || !activeDialogKey;
    const bottomTabsAsStaticFooter = selectedTab === "messages" && !activeDialogKey;

    // Форматирование имени пользователя для аватара
    const shortProfileName = useMemo(() => {
        if (!profile?.fullName) return "";
        const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
        return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1]?.charAt(0) || ""}.`.trim();
    }, [profile?.fullName]);

    // Пропсы для дочерних экранов
    const appViewProps = {
        ...appState,
        ImageUploader,
        AddressInput,
        adminApi,
        adsApi,
        authApi,
        bookingsApi,
        favoritesApi,
        messagesApi,
        notificationsApi,
        reviewsApi,
        uploadApi,
        usersApi,
        verificationApi,
        storage,
        initialDraft,
        navItems,
        propertyOptions,
        roomOptions,
        Field,
        Metric,
        Modal,
        Icon,
        DetailsModal,
        ListingCard,
        renderChatMessage,
        openDocumentViewer: (url, title) => setDocumentViewer({ url, title }),
        formatMoney,
        formatPriceWithType,
        fallbackImage,
        propertyLabel,
        roleLabel,
        statusLabel,
        autoResizeTextarea,
        dialogKey,
        groupMessagesByDay,
        normalizeInteger,
        normalizeNumber
    };

    // 1. Состояние начальной загрузки приложения
    if (bootstrapping) return <BootScreen {...appViewProps} />;

    // 2. Если пользователь не авторизован
    if (!profile) return <AuthScreen {...appViewProps} />;

    // 3. Состояние блокировки пользователя
    if (profile.blocked) {
        return (
            <SafeAreaView style={styles.blockedContainer}>
                <View style={[styles.blockedCard, styles.glass]}>
                    <Text style={styles.blockedTitle}>Ваш аккаунт заблокирован</Text>
                    <Text style={styles.blockedSubtitle}>
                        Доступ к системе ограничен. Обратитесь в поддержку или к администратору.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaProvider>
            <View style={styles.appShell}>
                {/* ==========================================
                ВЕРХНЯЯ ШАПКА ПРИЛОЖЕНИЯ (Topbar)
                ========================================== */}
                <SafeAreaView style={styles.topbarSafe} edges={["top"]} pointerEvents="box-none">
                <View style={[styles.topbar, styles.glass]}>
                    <View style={styles.brandLockup}>
                        <Image source={require("./assets/logo.png")} style={styles.logo} />
                        <Text style={styles.brandName}>Рент</Text>
                    </View>

                    <View style={styles.topbarActions}>
                        {/* Кнопка Уведомлений */}
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                                Keyboard.dismiss();
                                setNotificationsOpen(!notificationsOpen);
                            }}
                        >
                            <Bell size={22} color="#1C1C1E" strokeWidth={2.1} />
                            {notificationsUnread > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{notificationsUnread}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Аватар пользователя */}
                        <View style={styles.miniAvatar}>
                            {profile?.avatarUrl ? (
                                <Image source={{ uri: assetUrl(profile.avatarUrl) }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarFallbackText}>{shortProfileName?.charAt(0) || "П"}</Text>
                            )}
                        </View>

                        {/* Кнопка Выхода */}
                        <TouchableOpacity style={styles.iconButton} onPress={() => { Keyboard.dismiss(); handleLogout(); }}>
                            <LogOut size={23} color="#1C1C1E" strokeWidth={2.1} />
                        </TouchableOpacity>
                    </View>
                </View>
                </SafeAreaView>

                {/* ==========================================
                ОСНОВНОЙ КОНТЕНТ (Активный экран)
                ========================================== */}
                <SafeAreaView style={styles.contentSafe} edges={["top"]}>
                    <KeyboardAvoidingView
                        style={[
                            styles.mainPage,
                            bottomTabsAsStaticFooter ? styles.mainPageStaticFooter : showBottomTabs ? styles.mainPageWithTabs : styles.mainPageMessages,
                        ]}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
                    >
                        {selectedTab === "discover" && <DiscoverScreen {...appViewProps} />}
                        {selectedTab === "favorites" && <FavoritesScreen {...appViewProps} />}
                        {selectedTab === "messages" && <MessagesScreen {...appViewProps} />}
                        {selectedTab === "manage" && isLandlord && <ManageScreen {...appViewProps} />}
                        {selectedTab === "profile" && <ProfileScreen {...appViewProps} />}
                        {selectedTab === "admin" && isAdmin && <AdminScreen {...appViewProps} />}
                    </KeyboardAvoidingView>
                </SafeAreaView>

                {/* ==========================================
                НИЖНИЙ НАВИГАЦИОННЫЙ БАР (Bottom Tab Bar)
                ========================================== */}
                {showBottomTabs && <SafeAreaView style={bottomTabsAsStaticFooter ? styles.bottomTabSafeStatic : styles.bottomTabSafe} edges={["bottom"]} pointerEvents="box-none"><View style={[styles.bottomTabBar, styles.glass]}>
                    {visibleNavItems.map((item) => {
                        const TabIcon = tabIconMap[item.key] || Home;
                        const active = selectedTab === item.key; // ✅ Добавлена переменная active

                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={styles.tabItem}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    if (item.key === "messages") {
                                        setActiveDialogKey(null);
                                    }
                                    setSelectedTab(item.key);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={item.label}
                            >
                                <View style={[styles.tabIconPill, active && styles.tabIconPillActive]}>
                                    <TabIcon
                                        size={23}
                                        color={active ? "#007AFF" : "#8E8E93"}
                                        strokeWidth={active ? 2.45 : 2}
                                    />
                                    {item.key === "messages" && unreadCount > 0 && (
                                        <View style={styles.tabBadge}>
                                            <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View></SafeAreaView>}

                {/* ==========================================
                ШТОРКА УВЕДОМЛЕНИЙ (Full-screen Overlay)
                ========================================== */}
                {notificationsOpen && (
                    <View style={[styles.notificationsOverlay, styles.glass]}>
                        <SafeAreaView style={{ flex: 1 }}>
                            <View style={styles.notificationsHeader}>
                                <Text style={styles.notificationsTitle}>Уведомления</Text>
                                <View style={styles.notificationsHeaderActions}>
                                    <TouchableOpacity style={styles.ghostButton} onPress={clearNotifications}>
                                        <Text style={styles.ghostButtonText}>Удалить все</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.ghostButton} onPress={() => setNotificationsOpen(false)}>
                                        <Text style={styles.ghostButtonCloseText}>Закрыть</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={styles.notificationsList}>
                                {notifications.length ? notifications.map((item) => (
                                    <View key={item.id} style={[styles.notificationItem, item.read ? styles.notificationRead : styles.notificationUnread]}>
                                        <TouchableOpacity
                                            style={styles.notificationMainClick}
                                            onPress={() => {
                                                setExpandedNotificationId((prev) => prev === item.id ? null : item.id);
                                                markNotificationRead(item.id);
                                            }}
                                        >
                                            <Text style={styles.notificationItemTitle}>Вы получили сообщение от администратора</Text>
                                            <Text style={styles.notificationTime}>{new Date(item.createdAt).toLocaleString("ru-RU")}</Text>
                                            {expandedNotificationId === item.id && (
                                                <Text style={styles.notificationBodyText}>{item.message}</Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.notificationDeleteBtn} onPress={() => removeNotification(item.id)}>
                                            <Text style={styles.notificationDeleteBtnText}>Удалить</Text>
                                        </TouchableOpacity>
                                    </View>
                                )) : (
                                    <View style={styles.emptyInline}><Text style={styles.emptyInlineText}>Уведомлений пока нет.</Text></View>
                                )}
                            </ScrollView>
                        </SafeAreaView>
                    </View>
                )}

                {/* ==========================================
                ГЛОБАЛЬНЫЕ TOAST-УВЕДОМЛЕНИЯ
                ========================================== */}
                {(!!notice || !!error) && (
                    <View style={styles.toastStack}>
                        {!!notice && (
                            <View style={[styles.toastCard, styles.toastSuccess]}>
                                <Text style={styles.toastText}>{notice}</Text>
                                <TouchableOpacity onPress={() => setNotice("")} style={styles.toastCloseClick}>
                                    <Text style={styles.toastCloseX}>×</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {!!error && (
                            <View style={[styles.toastCard, styles.toastError]}>
                                <Text style={styles.toastText}>{error}</Text>
                                <TouchableOpacity onPress={() => setError("")} style={styles.toastCloseClick}>
                                    <Text style={styles.toastCloseX}>×</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Модальные окна глобального стейта */}
                <AppModals {...appViewProps} />
                <DocumentViewer document={documentViewer} onClose={() => setDocumentViewer(null)} />
            </View>
        </SafeAreaProvider>
    );
}

// ==========================================
// СТИЛИЗАЦИЯ (остается без изменений)
// ==========================================
const styles = StyleSheet.create({
    // ... все ваши стили остаются теми же
    appShell: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    glass: {
        backgroundColor: "rgba(255, 255, 255, 0.88)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    topbarSafe: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
    },
    topbar: {
        height: 56,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginHorizontal: 18,
        marginTop: 12,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.08)",
    },
    brandLockup: {
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        width: 28,
        height: 28,
        marginRight: 8,
        resizeMode: "contain",
    },
    brandName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1C1C1E",
    },
    topbarActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconButton: {
        padding: 6,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    badge: {
        position: "absolute",
        top: 2,
        right: 2,
        backgroundColor: "#FF3B30",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    badgeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "bold",
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#E5E5EA",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    avatarImg: {
        width: "100%",
        height: "100%",
    },
    avatarFallbackText: {
        fontSize: 14,
        color: "#636366",
        fontWeight: "600",
    },
    mainPage: {
        flex: 1,
        paddingTop: 84,
    },
    contentSafe: {
        flex: 1,
    },
    mainPageWithTabs: {
        paddingBottom: 98,
    },
    mainPageStaticFooter: {
        paddingBottom: 0,
    },
    mainPageMessages: {
        paddingBottom: 14,
    },
    bottomTabSafe: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
    },
    bottomTabSafeStatic: {
        zIndex: 30,
    },
    bottomTabBar: {
        marginHorizontal: 18,
        marginBottom: 12,
        height: 64,
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.08)",
        borderRadius: 32,
        paddingTop: 8,
        paddingBottom: 8,
        paddingHorizontal: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
        elevation: 14,
    },
    tabItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    tabIconPill: {
        width: 46,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    tabIconPillActive: {
        backgroundColor: "#EAF4FF",
    },
    tabBadge: {
        position: "absolute",
        top: 1,
        right: 2,
        backgroundColor: "#007AFF",
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "bold",
    },
    notificationsOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        padding: 16,
    },
    notificationsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    notificationsTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1C1C1E",
    },
    notificationsHeaderActions: {
        flexDirection: "row",
        gap: 12,
    },
    ghostButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    ghostButtonText: {
        color: "#8E8E93",
        fontSize: 14,
    },
    ghostButtonCloseText: {
        color: "#007AFF",
        fontSize: 14,
        fontWeight: "600",
    },
    notificationsList: {
        flex: 1,
    },
    notificationItem: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    notificationRead: {
        backgroundColor: "#F2F2F7",
    },
    notificationUnread: {
        backgroundColor: "#E5F0FF",
        borderLeftWidth: 3,
        borderLeftColor: "#007AFF",
    },
    notificationMainClick: {
        flex: 1,
        marginRight: 10,
    },
    notificationItemTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1C1C1E",
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 11,
        color: "#8E8E93",
        marginBottom: 6,
    },
    notificationBodyText: {
        fontSize: 13,
        color: "#3A3A3C",
        lineHeight: 18,
        marginTop: 4,
    },
    notificationDeleteBtn: {
        padding: 6,
    },
    notificationDeleteBtnText: {
        color: "#FF3B30",
        fontSize: 13,
    },
    emptyInline: {
        alignItems: "center",
        paddingVertical: 30,
    },
    emptyInlineText: {
        color: "#8E8E93",
        fontSize: 14,
    },
    toastStack: {
        position: "absolute",
        top: 70,
        left: 16,
        right: 16,
        zIndex: 1000,
        gap: 8,
    },
    toastCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },
    toastSuccess: {
        backgroundColor: "#34C759",
    },
    toastError: {
        backgroundColor: "#FF3B30",
    },
    toastText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
        marginRight: 10,
    },
    toastCloseClick: {
        padding: 4,
    },
    toastCloseX: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    blockedContainer: {
        flex: 1,
        backgroundColor: "#F2F2F7",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    blockedCard: {
        width: "100%",
        maxWidth: 340,
        padding: 24,
        borderRadius: 20,
        alignItems: "center",
    },
    blockedTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FF3B30",
        textAlign: "center",
        marginBottom: 10,
    },
    blockedSubtitle: {
        fontSize: 14,
        color: "#636366",
        textAlign: "center",
        lineHeight: 20,
    }
});
