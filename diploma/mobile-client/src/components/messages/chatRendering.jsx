import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from "react-native";
import { parseSystemPayload } from "../../shared/formUtils";
import { formatMoscowTime } from "../../shared/time";
import { assetUrl } from "../../lib/api";

/**
 * Рендеринг обычного текстового сообщения
 */
const renderTextMessage = (message, profile, isOutgoing) => (
    <View
        key={message.id}
        style={[styles.messageRow, isOutgoing ? styles.outgoingRow : styles.incomingRow]}
    >
        <View
            style={[
                styles.messageBubble,
                isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
            ]}
        >
            <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
                {message.text}
            </Text>
            <Text style={styles.messageTime}>{formatMoscowTime(message.createdAt)}</Text>
        </View>
    </View>
);

/**
 * Основной экспортируемый компонент рендеринга сообщений (системные + обычные)
 */
export const renderChatMessage = ({
                                      message,
                                      allMessages = [],
                                      profile,
                                      loadingMap,
                                      onViewingDecision,
                                      onViewingResult,
                                      onCreateContract,
                                      onSignContract,
                                      onOpenPayment,
                                      onOpenDocument,
                                  }) => {
    const payload = parseSystemPayload(message);

    // Обычное сообщение без системной логики
    if (!payload) {
        const isOutgoing = message.fromUserId === profile.id;
        return renderTextMessage(message, profile, isOutgoing);
    }

    // --- Системные сообщения ---
    const isRecipient = message.toUserId === profile.id;
    const landlordResponded = Boolean(payload.landlordResponded);
    const tenantResponded = Boolean(payload.tenantResponded);
    const bothViewingSidesResponded = landlordResponded && tenantResponded;
    const currentUserResponded =
        message.messageType === "viewing_result_prompt" &&
        ((message.fromUserId === profile.id && landlordResponded) ||
            (message.toUserId === profile.id && tenantResponded));
    const otherUserResponded =
        message.messageType === "viewing_result_prompt" &&
        ((message.fromUserId === profile.id && tenantResponded) ||
            (message.toUserId === profile.id && landlordResponded));
    const canAcceptProposal =
        message.messageType === "viewing_proposal" && payload.status === "pending" && isRecipient;
    const canConfirmResult =
        message.messageType === "viewing_result_prompt" &&
        message.relatedId &&
        !bothViewingSidesResponded &&
        !currentUserResponded &&
        ((message.fromUserId === profile.id && payload.landlordPrompt) ||
            (message.toUserId === profile.id && payload.tenantPrompt));
    const canCreateContract =
        message.messageType === "booking_ready" && message.fromUserId === profile.id && message.relatedId;
    const canSignContract =
        message.messageType === "contract_sent" && message.toUserId === profile.id && message.relatedId;
    const canOpenPayment =
        message.messageType === "payment_requested" && message.toUserId === profile.id && message.relatedId;

    const hasPaymentSuccess = allMessages.some((item) => item.messageType === "payment_success");
    const hasContractMovedToPayment = allMessages.some(
        (item) =>
            item.messageType === "payment_requested" ||
            item.messageType === "payment_success" ||
            item.messageType === "contract_active"
    );
    const isLandlordSide = message.fromUserId === profile.id;

    let systemText = payload.displayText || message.text;
    if (message.messageType === "payment_requested") {
        systemText = isLandlordSide ? "Ожидаем оплату от арендатора" : "Перейдите к оплате аренды";
    }
    if (message.messageType === "payment_success") {
        systemText = "Оплата прошла успешно";
    }
    if (typeof systemText === "string") {
        systemText = systemText.replace("Можно переходить к оформлению договора аренды.", "").trim();
    }

    // Условия скрытия сообщений (полностью не рендерим)
    if (message.messageType === "viewing_result_prompt" && bothViewingSidesResponded) return null;
    if (message.messageType === "contract_sent" && message.fromUserId === profile.id) return null;
    if (message.messageType === "contract_sent" && hasContractMovedToPayment) return null;
    if (message.messageType === "payment_requested" && hasPaymentSuccess) return null;

    const showCreateContractButton = canCreateContract && !hasContractMovedToPayment;
    const showContractFillButton = canSignContract && !hasContractMovedToPayment;
    const showContractOpenButton = message.messageType === "contract_sent" && payload.documentUrl;

    return (
        <View key={message.id} style={styles.systemMessageCard}>
            <View style={styles.systemMessageBody}>
                <Text style={styles.systemMessageText}>{systemText}</Text>

                {message.messageType === "viewing_result_prompt" && (
                    <Text style={styles.systemMessageSubtext}>
                        {currentUserResponded
                            ? "Вы уже подтвердили результат просмотра. Ожидаем подтверждения второй стороны."
                            : otherUserResponded
                                ? "Вторая сторона уже ответила. Подтвердите результат со своей стороны."
                                : message.fromUserId === profile.id
                                    ? payload.landlordPrompt
                                    : payload.tenantPrompt}
                    </Text>
                )}

                {message.messageType !== "payment_success" &&
                    message.messageType !== "contract_sent" &&
                    payload.documentUrl && (
                        <TouchableOpacity
                            style={styles.chatLinkButton}
                            onPress={() => onOpenDocument ? onOpenDocument(payload.documentUrl, "Документ") : Linking.openURL(assetUrl(payload.documentUrl))}
                        >
                            <Text style={styles.chatLinkText}>Открыть</Text>
                        </TouchableOpacity>
                    )}

                {message.messageType === "payment_success" && payload.receiptUrl && (
                    <TouchableOpacity
                        style={styles.chatLinkButton}
                        onPress={() => onOpenDocument ? onOpenDocument(payload.receiptUrl, "Чек оплаты") : Linking.openURL(assetUrl(payload.receiptUrl))}
                    >
                        <Text style={styles.chatLinkText}>Скачать чек</Text>
                    </TouchableOpacity>
                )}

                {canAcceptProposal && (
                    <View style={styles.systemMessageActions}>
                        <TouchableOpacity
                            style={styles.ghostButton}
                            onPress={() => onViewingDecision(message.id, false)}
                            disabled={loadingMap[`viewing-decision-${message.id}`]}
                        >
                            <Text style={styles.ghostButtonText}>Отклонить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => onViewingDecision(message.id, true)}
                            disabled={loadingMap[`viewing-decision-${message.id}`]}
                        >
                            <Text style={styles.primaryButtonText}>Согласиться</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {canConfirmResult && (
                    <View style={styles.systemMessageActions}>
                        <TouchableOpacity
                            style={styles.ghostButton}
                            onPress={() => onViewingResult(message.relatedId, false)}
                            disabled={loadingMap[`viewing-result-${message.relatedId}`]}
                        >
                            <Text style={styles.ghostButtonText}>
                                {message.fromUserId === profile.id ? "Не готов" : "Нет, отказываюсь"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => onViewingResult(message.relatedId, true)}
                            disabled={loadingMap[`viewing-result-${message.relatedId}`]}
                        >
                            <Text style={styles.primaryButtonText}>
                                {message.fromUserId === profile.id ? "Готов" : "Да, подтверждаю бронирование"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {showCreateContractButton && (
                    <View style={styles.systemMessageActions}>
                        <TouchableOpacity
                            style={styles.chatLinkButton}
                            onPress={() => onCreateContract(message.relatedId)}
                        >
                            <Text style={styles.chatLinkText}>Заполнить</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {showContractFillButton && (
                    <View style={styles.systemMessageActionsColumn}>
                        <TouchableOpacity
                            style={styles.chatLinkButton}
                            onPress={() => onSignContract(message.relatedId, payload)}
                            disabled={loadingMap[`contract-sign-${message.relatedId}`]}
                        >
                            <Text style={styles.chatLinkText}>Заполнить</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {showContractOpenButton && (
                    <View style={styles.systemMessageActionsColumn}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => onOpenDocument ? onOpenDocument(payload.documentUrl, "Договор") : Linking.openURL(assetUrl(payload.documentUrl))}
                        >
                            <Text style={styles.secondaryButtonText}>Открыть</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {canOpenPayment && (
                    <View style={styles.systemMessageActions}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => onOpenPayment(message.relatedId)}
                            disabled={loadingMap["payment-modal"]}
                        >
                            <Text style={styles.primaryButtonText}>Оплатить</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

// ------------------------- СТИЛИ -------------------------
const styles = StyleSheet.create({
    // Сообщения
    messageRow: {
        marginBottom: 12,
        flexDirection: "row",
    },
    incomingRow: {
        justifyContent: "flex-start",
    },
    outgoingRow: {
        justifyContent: "flex-end",
    },
    messageBubble: {
        maxWidth: "80%",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
    },
    incomingBubble: {
        backgroundColor: "#E5E5EA",
        borderBottomLeftRadius: 4,
    },
    outgoingBubble: {
        backgroundColor: "#007AFF",
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 14,
        color: "#1C1C1E",
    },
    outgoingText: {
        color: "#FFFFFF",
    },
    messageTime: {
        fontSize: 10,
        color: "#8E8E93",
        marginTop: 4,
        alignSelf: "flex-end",
    },

    // Системные сообщения
    systemMessageCard: {
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
        marginVertical: 8,
        padding: 12,
    },
    systemMessageBody: {
        gap: 8,
    },
    systemMessageText: {
        fontSize: 14,
        color: "#1C1C1E",
    },
    systemMessageSubtext: {
        fontSize: 12,
        color: "#8E8E93",
    },
    systemMessageActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 8,
    },
    systemMessageActionsColumn: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        marginTop: 8,
    },
    ghostButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#C6C6C8",
    },
    ghostButtonText: {
        color: "#007AFF",
        fontSize: 14,
    },
    primaryButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#007AFF",
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
    secondaryButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#E5E5EA",
    },
    secondaryButtonText: {
        color: "#1C1C1E",
        fontSize: 14,
    },
    chatLinkButton: {
        paddingVertical: 4,
    },
    chatLinkText: {
        color: "#007AFF",
        fontSize: 14,
        textDecorationLine: "underline",
    },
});
