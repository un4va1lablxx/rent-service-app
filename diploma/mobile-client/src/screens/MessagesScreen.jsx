// MessagesScreen.js
import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Image,
    Platform,
    StyleSheet,
    useWindowDimensions,
    SafeAreaView,
} from "react-native";
import { renderChatMessage } from "../components/messages/chatRendering.jsx";
import { groupMessagesByDay } from "../shared/formUtils";
import { formatMoscowTime } from "../shared/time";
import { parseSystemPayload } from "../shared/formUtils";
import { assetUrl } from "../lib/api";
import { compactName } from "../shared/formatters";
import { ArrowLeft, SendHorizontal } from "lucide-react-native";

const Glyph = ({ name, size = 22, color = "#1C1C1E" }) => {
    const glyphs = {
        "chat-bubble-outline": "✉",
        "arrow-back": "‹",
        send: "➤",
    };
    return <Text style={{ color, fontSize: size, fontWeight: "800", lineHeight: size + 2 }}>{glyphs[name] || "•"}</Text>;
};

// ------------------------- Вспомогательные компоненты -------------------------
const ChatIllustration = () => (
    <View style={styles.emptyIllustrationContainer}>
        <Glyph name="chat-bubble-outline" size={54} color="#C6C6C8" />
    </View>
);

const UserAvatar = ({ name, avatarUrl, size = 40 }) => {
    if (avatarUrl) {
        return (
            <Image
                source={{ uri: assetUrl(avatarUrl) }}
                style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
            />
        );
    }
    const initial = name?.charAt(0)?.toUpperCase() || "?";
    return (
        <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
    );
};

// ------------------------- ОСНОВНОЙ КОМПОНЕНТ -------------------------
export const MessagesScreen = (props) => {
    const {
        profile,
        dialogs,
        activeDialogKey,
        setActiveDialogKey,
        activeDialogMessages,
        selectedDialog,
        loadingMap,
        composeText,
        setComposeText,
        setSelectedAd,
        setSelectedAdId,
        adsApi,
        dialogKey,
        loadDialogMessages,
        handleViewingDecision,
        handleViewingResult,
        openContractComposer,
        handleSignContract,
        openPaymentModal,
        setViewingModal,
        handleSendMessage,
        openDocumentViewer,
    } = props;

    const { width } = useWindowDimensions();
    const isLargeScreen = width > 900;
    const [showDialogList, setShowDialogList] = useState(isLargeScreen);

    // Адаптивное переключение при изменении ширины
    useEffect(() => {
        if (isLargeScreen) {
            setShowDialogList(true);
        } else if (!activeDialogKey) {
            setShowDialogList(true);
        } else {
            setShowDialogList(false);
        }
    }, [isLargeScreen, activeDialogKey]);

    // Фильтрация дубликатов viewing_result_prompt
    const visibleDialogMessages = useMemo(() => {
        const seenViewingPrompts = new Set();
        return activeDialogMessages.filter((message) => {
            if (message.messageType !== "viewing_result_prompt" || !message.relatedId) return true;
            const key = String(message.relatedId);
            if (seenViewingPrompts.has(key)) return false;
            seenViewingPrompts.add(key);
            return true;
        });
    }, [activeDialogMessages]);

    const openDialog = (dialog) => {
        Keyboard.dismiss();
        setActiveDialogKey(dialogKey(dialog));
        loadDialogMessages(dialog);
        if (!isLargeScreen) {
            setShowDialogList(false);
        }
    };

    // Рендер элемента списка диалогов
    const renderDialogItem = ({ item: dialog }) => {
        const isActive = activeDialogKey === dialogKey(dialog);
        return (
            <TouchableOpacity
                style={[styles.dialogItem, isActive && styles.dialogItemActive]}
                onPress={() => openDialog(dialog)}
            >
                <UserAvatar
                    name={dialog.otherUserName}
                    avatarUrl={dialog.otherUserAvatarUrl}
                    size={48}
                />
                <View style={styles.dialogInfo}>
                    <View style={styles.dialogNameRow}>
                        <Text style={styles.dialogName} numberOfLines={1}>
                            {compactName(dialog.otherUserName) || dialog.otherUserName}
                        </Text>
                        {dialog.unreadCount > 0 && (
                            <View style={styles.dialogBadge}>
                                <Text style={styles.dialogBadgeText}>{dialog.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.dialogPreview} numberOfLines={1}>
                        {dialog.lastMessageText || "Начните диалог"}
                    </Text>
                    <Text style={styles.dialogAdTitle} numberOfLines={1}>
                        {dialog.adTitle}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Рендер группы сообщений по дням
    const renderMessageGroup = ({ item: group }) => (
        <>
            <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{group.day}</Text>
            </View>
            {group.messages.map((msg) =>
                renderChatMessage({
                    message: msg,
                    allMessages: visibleDialogMessages,
                    profile,
                    loadingMap,
                    onViewingDecision: handleViewingDecision,
                    onViewingResult: handleViewingResult,
                    onCreateContract: (bookingId) => openContractComposer(bookingId, selectedDialog?.adId),
                    onSignContract: handleSignContract,
                    onOpenPayment: openPaymentModal,
                    onOpenDocument: openDocumentViewer,
                })
            )}
        </>
    );

    const groupedMessages = useMemo(
        () => (visibleDialogMessages.length ? groupMessagesByDay(visibleDialogMessages) : []),
        [visibleDialogMessages, groupMessagesByDay]
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoider}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
            >
            <View style={[styles.innerContainer, showDialogList ? styles.showSidebar : styles.showChat]}>
                {/* Сайдбар со списком диалогов */}
                {showDialogList && (
                    <View style={styles.sidebar}>
                        <View style={styles.sidebarHeader}>
                            <View>
                                <Text style={styles.sidebarTitle}>Сообщения</Text>
                                <Text style={styles.sidebarSubtitle}>Все диалоги по объявлениям</Text>
                            </View>
                            {dialogs.length > 0 && (
                                <View style={styles.dialogsCount}>
                                    <Text style={styles.dialogsCountText}>{dialogs.length}</Text>
                                </View>
                            )}
                        </View>
                        {dialogs.length === 0 ? (
                            <View style={styles.emptyDialogs}>
                                <ChatIllustration />
                                <Text style={styles.emptyDialogsText}>Диалогов пока нет</Text>
                                <Text style={styles.emptyDialogsHint}>
                                    Откройте объявление и начните переписку с владельцем
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={dialogs}
                                keyExtractor={(item) => dialogKey(item)}
                                renderItem={renderDialogItem}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="always"
                                contentContainerStyle={styles.dialogsList}
                            />
                        )}
                    </View>
                )}

                {/* Область чата */}
                {!showDialogList && (
                    <View style={styles.chatArea}>
                        {!activeDialogKey || !selectedDialog ? (
                            <View style={styles.chatPlaceholder}>
                                <ChatIllustration />
                                <Text style={styles.chatPlaceholderTitle}>Выберите чат</Text>
                                <Text style={styles.chatPlaceholderText}>
                                    Откройте диалог из списка, чтобы продолжить общение
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.chatHeader}>
                                    <View style={styles.chatUserInfo}>
                                        <TouchableOpacity
                                            style={styles.backButton}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setActiveDialogKey(null);
                                                setShowDialogList(true);
                                            }}
                                        >
                                            <ArrowLeft size={25} color="#007AFF" strokeWidth={2.7} />
                                        </TouchableOpacity>
                                        <UserAvatar
                                            name={selectedDialog.otherUserName}
                                            avatarUrl={selectedDialog.otherUserAvatarUrl}
                                            size={50}
                                        />
                                        <View style={styles.chatUserText}>
                                            <Text style={styles.chatUserName}>{compactName(selectedDialog.otherUserName) || selectedDialog.otherUserName}</Text>
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    Keyboard.dismiss();
                                                    const ad = await adsApi.details(selectedDialog.adId);
                                                    setSelectedAd({ ...ad, _viewOnly: true });
                                                    setSelectedAdId(selectedDialog.adId);
                                                }}
                                            >
                                                <Text style={styles.chatAdLink} numberOfLines={1}>
                                                    {selectedDialog.adTitle}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.viewingButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setViewingModal({ open: true, date: "", time: "" });
                                        }}
                                    >
                                        <Text style={styles.viewingButtonText}>Предложить время просмотра</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.messagesIsland}>
                                <FlatList
                                    data={groupedMessages}
                                    keyExtractor={(_, index) => `group-${index}`}
                                    renderItem={renderMessageGroup}
                                    contentContainerStyle={styles.messagesList}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="always"
                                />
                                </View>

                                <View style={styles.composeBar}>
                                    <View style={styles.composeInputIsland}>
                                    <TextInput
                                        style={styles.composeInput}
                                        placeholder="Напишите сообщение..."
                                        value={composeText}
                                        onChangeText={setComposeText}
                                        multiline
                                        numberOfLines={1}
                                        onKeyPress={({ nativeEvent }) => {
                                            if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
                                                Keyboard.dismiss();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.sendButton,
                                            (!composeText.trim() || loadingMap["send-message"]) && styles.sendButtonDisabled,
                                        ]}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            handleSendMessage();
                                        }}
                                        disabled={loadingMap["send-message"] || !composeText.trim()}
                                    >
                                        <SendHorizontal size={25} color={composeText.trim() ? "#007AFF" : "#C6C6C8"} strokeWidth={2.7} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                )}
            </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// ------------------------- СТИЛИ -------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    innerContainer: {
        flex: 1,
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 12,
    },
    keyboardAvoider: {
        flex: 1,
    },
    showSidebar: {
        // стиль не обязателен, просто для маркера
    },
    showChat: {
        // стиль не обязателен
    },
    sidebar: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 5,
    },
    sidebarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E5E5EA",
    },
    sidebarTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1C1C1E",
    },
    sidebarSubtitle: {
        fontSize: 13,
        color: "#8E8E93",
        marginTop: 2,
    },
    dialogsCount: {
        backgroundColor: "#E5E5EA",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    dialogsCountText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#1C1C1E",
    },
    dialogsList: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        paddingBottom: 8,
    },
    dialogItem: {
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 18,
        marginBottom: 4,
    },
    dialogItemActive: {
        backgroundColor: "#E5F0FF",
    },
    dialogInfo: {
        flex: 1,
        marginLeft: 12,
    },
    dialogNameRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dialogName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1C1C1E",
        flex: 1,
    },
    dialogBadge: {
        backgroundColor: "#007AFF",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        marginLeft: 8,
    },
    dialogBadgeText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "bold",
    },
    dialogPreview: {
        fontSize: 13,
        color: "#8E8E93",
        marginTop: 2,
    },
    dialogAdTitle: {
        fontSize: 11,
        color: "#C6C6C8",
        marginTop: 2,
    },
    chatArea: {
        flex: 2,
        backgroundColor: "transparent",
        gap: 10,
    },
    chatPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    chatPlaceholderTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1C1C1E",
        marginTop: 16,
    },
    chatPlaceholderText: {
        fontSize: 14,
        color: "#8E8E93",
        textAlign: "center",
        marginTop: 8,
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 5,
    },
    chatUserInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 8,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    chatUserText: {
        marginLeft: 12,
        flex: 1,
    },
    chatUserName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1C1C1E",
    },
    chatAdLink: {
        fontSize: 13,
        color: "#007AFF",
        marginTop: 2,
    },
    viewingButton: {
        backgroundColor: "#E5F0FF",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: 150,
        alignItems: "center",
    },
    viewingButtonText: {
        fontSize: 13,
        color: "#007AFF",
        fontWeight: "500",
        textAlign: "center",
    },
    messagesIsland: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 5,
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    dateSeparator: {
        alignItems: "center",
        marginVertical: 12,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: "#8E8E93",
        backgroundColor: "#F2F2F7",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: "hidden",
    },
    composeBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingBottom: 10,
    },
    composeInputIsland: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 5,
    },
    composeInput: {
        width: "100%",
        backgroundColor: "#F2F2F7",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 40,
        lineHeight: 20,
        maxHeight: 100,
        fontSize: 14,
        color: "#1C1C1E",
        includeFontPadding: false,
        textAlign: "left",
        textAlignVertical: "center",
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 5,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    emptyIllustrationContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    avatar: {
        backgroundColor: "#E5E5EA",
    },
    avatarPlaceholder: {
        backgroundColor: "#E5E5EA",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: {
        fontWeight: "600",
        color: "#636366",
    },
    emptyDialogs: {
        alignItems: "center",
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    emptyDialogsText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1C1C1E",
        marginTop: 16,
    },
    emptyDialogsHint: {
        fontSize: 13,
        color: "#8E8E93",
        textAlign: "center",
        marginTop: 8,
    },
});
