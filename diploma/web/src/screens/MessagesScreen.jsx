import { useEffect, useMemo, useState } from "react";

function ChatIllustration() {
    return (
        <svg className="empty-illustration" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="12" y="14" width="40" height="28" rx="14" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M24 42v8l9-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 25h16M24 31h10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}

function UserAvatar({ name, avatarUrl, className }) {
    if (avatarUrl) {
        return (
            <div className={`${className} has-photo`}>
                <img src={avatarUrl} alt={name || "Пользователь"} />
            </div>
        );
    }

    return (
        <div className={className}>
            <span className="avatar-initial">
                {name?.charAt(0)?.toUpperCase() || "?"}
            </span>
        </div>
    );
}

export function MessagesScreen(props) {
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
        groupMessagesByDay,
        renderChatMessage,
        handleViewingDecision,
        handleViewingResult,
        openContractComposer,
        handleSignContract,
        openPaymentModal,
        setViewingModal,
        autoResizeTextarea,
        handleSendMessage
    } = props;

    const [showDialogList, setShowDialogList] = useState(() => (
        typeof window === "undefined" ? true : window.innerWidth > 900
    ));
    const visibleDialogMessages = useMemo(() => {
        const seenViewingPrompts = new Set();
        return activeDialogMessages.filter((message) => {
            if (message.messageType !== "viewing_result_prompt" || !message.relatedId) {
                return true;
            }
            const key = String(message.relatedId);
            if (seenViewingPrompts.has(key)) {
                return false;
            }
            seenViewingPrompts.add(key);
            return true;
        });
    }, [activeDialogMessages]);

    useEffect(() => {
        function syncLayout() {
            if (window.innerWidth > 900) {
                setShowDialogList(true);
            } else if (!activeDialogKey) {
                setShowDialogList(true);
            }
        }

        syncLayout();
        window.addEventListener("resize", syncLayout);
        return () => window.removeEventListener("resize", syncLayout);
    }, [activeDialogKey]);

    function openDialog(dialog) {
        setActiveDialogKey(dialogKey(dialog));
        loadDialogMessages(dialog);
        if (window.innerWidth <= 900) {
            setShowDialogList(false);
        }
    }

    return (
        <div className={`messages-container ${showDialogList ? "show-sidebar" : "show-chat"}`}>
            <aside className="dialogs-sidebar">
                <div className="dialogs-header">
                    <div>
                        <h2>Сообщения</h2>
                        <p className="dialogs-subtitle">Все диалоги по объявлениям</p>
                    </div>
                    {dialogs.length > 0 && <span className="dialogs-count">{dialogs.length}</span>}
                </div>

                <div className="dialogs-list">
                    {dialogs.length === 0 ? (
                        <div className="empty-dialogs">
                            <ChatIllustration />
                            <p>Диалогов пока нет</p>
                            <span>Откройте объявление и начните переписку с владельцем</span>
                        </div>
                    ) : (
                        dialogs.map((dialog) => (
                            <button
                                key={dialogKey(dialog)}
                                type="button"
                                className={`dialog-item ${activeDialogKey === dialogKey(dialog) ? "active" : ""}`}
                                onClick={() => openDialog(dialog)}
                            >
                                <UserAvatar
                                    className="dialog-avatar"
                                    name={dialog.otherUserName}
                                    avatarUrl={dialog.otherUserAvatarUrl}
                                />
                                <div className="dialog-info">
                                    <div className="dialog-name-row">
                                        <span className="dialog-name">{dialog.otherUserName}</span>
                                        {dialog.unreadCount > 0 && (
                                            <span className="dialog-badge">{dialog.unreadCount}</span>
                                        )}
                                    </div>
                                    <span className="dialog-preview">{dialog.lastMessageText || "Начните диалог"}</span>
                                    <span className="dialog-ad-title">{dialog.adTitle}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            <section className="chat-area">
                {!activeDialogKey || !selectedDialog ? (
                    <div className="chat-placeholder">
                        <ChatIllustration />
                        <h3>Выберите чат</h3>
                        <p>Откройте диалог из списка, чтобы продолжить общение</p>
                    </div>
                ) : (
                    <>
                        <div className="chat-header">
                            <div className="chat-user-info">
                                <button
                                    type="button"
                                    className="chat-back-button"
                                    onClick={() => setShowDialogList(true)}
                                    title="Назад к диалогам"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M14.5 5 8 12l6.5 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <UserAvatar
                                    className="chat-avatar"
                                    name={selectedDialog.otherUserName}
                                    avatarUrl={selectedDialog.otherUserAvatarUrl}
                                />
                                <div>
                                    <h3>{selectedDialog.otherUserName}</h3>
                                    <button
                                        className="chat-ad-link"
                                        type="button"
                                        onClick={async () => {
                                            const ad = await adsApi.details(selectedDialog.adId);
                                            setSelectedAd({ ...ad, _viewOnly: true });
                                            setSelectedAdId(selectedDialog.adId);
                                        }}
                                    >
                                        {selectedDialog.adTitle}
                                    </button>
                                </div>
                            </div>
                            <button
                                className="secondary-button chat-viewing-button"
                                type="button"
                                onClick={() => setViewingModal({ open: true, date: "", time: "" })}
                            >
                                Предложить время просмотра
                            </button>
                        </div>

                        <div className="chat-messages">
                            {visibleDialogMessages.length === 0 ? (
                                <div className="chat-welcome">
                                    <ChatIllustration />
                                    <p>Сообщений пока нет</p>
                                    <span>Напишите первое сообщение</span>
                                </div>
                            ) : (
                                groupMessagesByDay(visibleDialogMessages).map((group, groupIndex) => (
                                    <div key={groupIndex}>
                                        <div className="messages-date-separator">
                                            <span>{group.day}</span>
                                        </div>
                                        {group.messages.map((message) => (
                                            renderChatMessage({
                                                message,
                                                allMessages: visibleDialogMessages,
                                                profile,
                                                loadingMap,
                                                onViewingDecision: handleViewingDecision,
                                                onViewingResult: handleViewingResult,
                                                onCreateContract: (bookingId) => openContractComposer(bookingId, selectedDialog.adId),
                                                onSignContract: handleSignContract,
                                                onOpenPayment: openPaymentModal
                                            })
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="chat-compose">
                            <div className="compose-wrapper">
                                <textarea
                                    className="compose-input"
                                    placeholder="Напишите сообщение..."
                                    value={composeText}
                                    onChange={(event) => {
                                        setComposeText(event.target.value);
                                        autoResizeTextarea(event.target);
                                    }}
                                    onKeyPress={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSendMessage();
                                            setTimeout(() => {
                                                if (event.target) {
                                                    event.target.style.height = "auto";
                                                }
                                            }, 0);
                                        }
                                    }}
                                    rows={1}
                                />
                                <button
                                    className="icon-button send-button"
                                    type="button"
                                    onClick={handleSendMessage}
                                    disabled={loadingMap["send-message"] || !composeText.trim()}
                                    title="Отправить"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path
                                            d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}




