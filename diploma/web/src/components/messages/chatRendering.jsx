import { parseSystemPayload } from "../../shared/formUtils";
import { formatMoscowTime } from "../../shared/time";

export function renderChatMessage({
    message,
    allMessages = [],
    profile,
    loadingMap,
    onViewingDecision,
    onViewingResult,
    onCreateContract,
    onSignContract,
    onOpenPayment
}) {
    const payload = parseSystemPayload(message);
    if (!payload) {
        return (
            <div
                key={message.id}
                className={`chat-message ${message.fromUserId === profile.id ? "outgoing" : "incoming"}`}
            >
                <div className="message-bubble">
                    <div className="message-text">{message.text}</div>
                    <div className="message-footer">
                        <span className="message-time">{formatMoscowTime(message.createdAt)}</span>
                    </div>
                </div>
            </div>
        );
    }

    const isRecipient = message.toUserId === profile.id;
    const landlordResponded = Boolean(payload.landlordResponded);
    const tenantResponded = Boolean(payload.tenantResponded);
    const bothViewingSidesResponded = landlordResponded && tenantResponded;
    const currentUserResponded = message.messageType === "viewing_result_prompt"
        && ((message.fromUserId === profile.id && landlordResponded)
            || (message.toUserId === profile.id && tenantResponded));
    const otherUserResponded = message.messageType === "viewing_result_prompt"
        && ((message.fromUserId === profile.id && tenantResponded)
            || (message.toUserId === profile.id && landlordResponded));
    const canAcceptProposal = message.messageType === "viewing_proposal" && payload.status === "pending" && isRecipient;
    const canConfirmResult = message.messageType === "viewing_result_prompt" && message.relatedId
        && !bothViewingSidesResponded
        && !currentUserResponded
        && ((message.fromUserId === profile.id && payload.landlordPrompt) || (message.toUserId === profile.id && payload.tenantPrompt));
    const canCreateContract = message.messageType === "booking_ready" && message.fromUserId === profile.id && message.relatedId;
    const canSignContract = message.messageType === "contract_sent" && message.toUserId === profile.id && message.relatedId;
    const canOpenPayment = message.messageType === "payment_requested" && message.toUserId === profile.id && message.relatedId;
    const hasPaymentSuccess = allMessages.some((item) => item.messageType === "payment_success");
    const hasContractMovedToPayment = allMessages.some((item) =>
        item.messageType === "payment_requested"
        || item.messageType === "payment_success"
        || item.messageType === "contract_active"
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

    if (message.messageType === "viewing_result_prompt" && bothViewingSidesResponded) {
        return null;
    }
    if (message.messageType === "contract_sent" && message.fromUserId === profile.id) {
        return null;
    }
    if (message.messageType === "contract_sent" && hasContractMovedToPayment) {
        return null;
    }
    if (message.messageType === "payment_requested" && hasPaymentSuccess) {
        return null;
    }

    const showCreateContractButton = canCreateContract && !hasContractMovedToPayment;
    const showContractFillButton = canSignContract && !hasContractMovedToPayment;
    const showContractOpenButton = message.messageType === "contract_sent" && payload.documentUrl;

    return (
        <div key={message.id} className="system-message-card">
            <div className="system-message-body">
                <div className="system-message-text">{systemText}</div>
                {message.messageType === "viewing_result_prompt" && (
                    <div className="system-message-subtext">
                        {currentUserResponded
                            ? "Вы уже подтвердили результат просмотра. Ожидаем подтверждения второй стороны."
                            : otherUserResponded
                                ? "Вторая сторона уже ответила. Подтвердите результат со своей стороны."
                                : (message.fromUserId === profile.id ? payload.landlordPrompt : payload.tenantPrompt)}
                    </div>
                )}
                {message.messageType !== "payment_success" && message.messageType !== "contract_sent" && payload.documentUrl && (
                    <a className="chat-ad-link" href={payload.documentUrl} target="_blank" rel="noreferrer">
                        Открыть
                    </a>
                )}
                {message.messageType === "payment_success" && payload.receiptUrl && (
                    <a className="chat-ad-link" href={payload.receiptUrl} target="_blank" rel="noreferrer">
                        Скачать чек
                    </a>
                )}
                {canAcceptProposal && (
                    <div className="system-message-actions">
                        <button
                            className="ghost-button"
                            onClick={() => onViewingDecision(message.id, false)}
                            disabled={loadingMap[`viewing-decision-${message.id}`]}
                        >
                            Отклонить
                        </button>
                        <button
                            className="primary-button"
                            onClick={() => onViewingDecision(message.id, true)}
                            disabled={loadingMap[`viewing-decision-${message.id}`]}
                        >
                            Согласиться
                        </button>
                    </div>
                )}
                {canConfirmResult && (
                    <div className="system-message-actions">
                        <button
                            className="ghost-button"
                            onClick={() => onViewingResult(message.relatedId, false)}
                            disabled={loadingMap[`viewing-result-${message.relatedId}`]}
                        >
                            {message.fromUserId === profile.id ? "Не готов" : "Нет, отказываюсь"}
                        </button>
                        <button
                            className="primary-button"
                            onClick={() => onViewingResult(message.relatedId, true)}
                            disabled={loadingMap[`viewing-result-${message.relatedId}`]}
                        >
                            {message.fromUserId === profile.id ? "Готов" : "Да, подтверждаю бронирование"}
                        </button>
                    </div>
                )}
                {showCreateContractButton && (

                    <div className="system-message-actions">
                        <button className="chat-ad-link" onClick={() => onCreateContract(message.relatedId)}>
                            Заполнить
                        </button>
                    </div>
                )}
                {showContractFillButton && (
                    <div className="system-message-actions system-message-actions-column">
                        <button
                            className="chat-ad-link"
                            onClick={() => onSignContract(message.relatedId, payload)}
                            disabled={loadingMap[`contract-sign-${message.relatedId}`]}
                        >
                            Заполнить
                        </button>
                    </div>
                )}
                {showContractOpenButton && (
                    <div className="system-message-actions system-message-actions-column">
                        <a className="secondary-button chat-system-link-button" href={payload.documentUrl} target="_blank" rel="noreferrer">
                            Открыть
                        </a>
                    </div>
                )}
                {canOpenPayment && (
                    <div className="system-message-actions">
                        <button
                            className="primary-button"
                            onClick={() => onOpenPayment(message.relatedId)}
                            disabled={loadingMap["payment-modal"]}
                        >
                            Оплатить
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
