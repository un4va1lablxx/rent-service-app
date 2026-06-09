import { useMemo, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import AddressInput from "./components/AddressInput.jsx";
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
} from "./lib/api";
import { initialDraft, navItems, propertyOptions, roomOptions } from "./shared/appConstants";
import { Field, Metric, Modal, Icon } from "./components/ui";
import { DetailsModal, ListingCard, VerificationBadge } from "./components/listings/ListingComponents";
import { renderChatMessage } from "./components/messages/chatRendering";
import { fallbackImage, formatMoney, formatPriceWithType, propertyLabel, roleLabel, statusLabel } from "./shared/formatters";
import {
    autoResizeTextarea,
    dialogKey,
    groupMessagesByDay,
    normalizeInteger,
    normalizeNumber
} from "./shared/formUtils";
import { BootScreen } from "./screens/BootScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { MessagesScreen } from "./screens/MessagesScreen";
import { ManageScreen } from "./screens/ManageScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { AppModals } from "./components/app/AppModals";
import { useRentServiceApp } from "./app/useRentServiceApp";

export default function App() {
    const appState = useRentServiceApp();
    const {
        bootstrapping,
        profile,
        visibleNavItems,
        selectedTab,
        setSelectedTab,
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

    const shortProfileName = useMemo(() => {
        if (!profile?.fullName) return "";
        const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0];
        return `${parts[1]} ${parts[0]?.charAt(0) || ""}.`.trim();
    }, [profile?.fullName]);

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
        VerificationBadge,
        renderChatMessage,
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

    const notificationsPanel = notificationsOpen && (
        <div className="notifications-dropdown notifications-dropdown-portal glass">
            <div className="notifications-modal-head">
                <h3>Уведомления</h3>
                <div className="notifications-head-actions">
                    <button className="ghost-button" type="button" onClick={clearNotifications}>Удалить все</button>
                    <button className="ghost-button" type="button" onClick={() => setNotificationsOpen(false)}>Закрыть</button>
                </div>
            </div>
            <div className="notifications-list">
                {notifications.length ? notifications.map((item) => (
                    <div key={item.id} className={`notification-item ${item.read ? "is-read" : "is-unread"}`}>
                        <button
                            className="notification-main"
                            type="button"
                            onClick={() => {
                                setExpandedNotificationId((prev) => prev === item.id ? null : item.id);
                                markNotificationRead(item.id);
                            }}
                        >
                            <strong>Вы получили сообщение от администратора</strong>
                            <small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small>
                            {expandedNotificationId === item.id && <p>{item.message}</p>}
                        </button>
                        <button className="notification-delete" type="button" onClick={() => removeNotification(item.id)}>Удалить</button>
                    </div>
                )) : <div className="empty-inline">Уведомлений пока нет.</div>}
            </div>
        </div>
    );

    if (bootstrapping) return <BootScreen {...appViewProps} />;
    if (!profile) return <AuthScreen {...appViewProps} />;

    if (profile.blocked) {
        return (
            <div className="blocked-screen">
                <div className="blocked-screen-card glass">
                    <h1>Ваш аккаунт заблокирован</h1>
                    <p>Доступ к системе ограничен. Обратитесь в поддержку или к администратору.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <header className="topbar glass">
                <div className="brand-lockup">
                    <div className="brand-mark"><img src="/logo.png" alt="Логотип Rent" /></div>
                    <div className="brand-name">Рент</div>
                </div>
                <div className="topbar-nav-shell">
                    <div className="topbar-nav-track">
                        <nav className="topbar-nav">
                            {visibleNavItems.map((item) => (
                                <button key={item.key} className={selectedTab === item.key ? "active" : ""} type="button" onClick={() => setSelectedTab(item.key)}>
                                    {item.label}
                                    {item.key === "messages" && unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                                </button>
                            ))}
                        </nav>
                        <div className="topbar-account">
                            <button className="icon-button notifications-button" type="button" onClick={() => setNotificationsOpen(!notificationsOpen)} title="Уведомления">
                                <img src="/notifications-bell.png" alt="Уведомления" />
                                {notificationsUnread > 0 && <span className="badge">{notificationsUnread}</span>}
                            </button>
                            <div className={`topbar-mini-avatar ${profile?.avatarUrl ? "has-photo" : ""}`}>
                                {profile?.avatarUrl ? <img src={assetUrl(profile.avatarUrl)} alt={shortProfileName} /> : <span>{shortProfileName?.charAt(0) || "П"}</span>}
                            </div>
                            <span className="topbar-user-short">{shortProfileName}</span>
                            <button className="icon-button" type="button" onClick={handleLogout} title="Выйти"><Icon name="logout" /></button>
                            {notificationsOpen && (
                                <div className="notifications-dropdown glass">
                                    <div className="notifications-modal-head">
                                        <h3>Уведомления</h3>
                                        <div className="notifications-head-actions">
                                            <button className="ghost-button" type="button" onClick={clearNotifications}>Удалить все</button>
                                            <button className="ghost-button" type="button" onClick={() => setNotificationsOpen(false)}>Закрыть</button>
                                        </div>
                                    </div>
                                    <div className="notifications-list">
                                        {notifications.length ? notifications.map((item) => (
                                            <div key={item.id} className={`notification-item ${item.read ? "is-read" : "is-unread"}`}>
                                                <button
                                                    className="notification-main"
                                                    type="button"
                                                    onClick={() => {
                                                        setExpandedNotificationId((prev) => prev === item.id ? null : item.id);
                                                        markNotificationRead(item.id);
                                                    }}
                                                >
                                                    <strong>Вы получили сообщение от администратора</strong>
                                                    <small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small>
                                                    {expandedNotificationId === item.id && <p>{item.message}</p>}
                                                </button>
                                                <button className="notification-delete" type="button" onClick={() => removeNotification(item.id)}>Удалить</button>
                                            </div>
                                        )) : <div className="empty-inline">Уведомлений пока нет.</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {notificationsPanel}

            <main className="page">
                {selectedTab === "discover" && <DiscoverScreen {...appViewProps} />}
                {selectedTab === "favorites" && <FavoritesScreen {...appViewProps} />}
                {selectedTab === "messages" && <MessagesScreen {...appViewProps} />}
                {selectedTab === "manage" && isLandlord && <ManageScreen {...appViewProps} />}
                {selectedTab === "profile" && <ProfileScreen {...appViewProps} />}
                {selectedTab === "admin" && isAdmin && <AdminScreen {...appViewProps} />}
            </main>

            {(notice || error) && (
                <div className="toast-stack" aria-live="polite">
                    {notice && <div className="toast-card toast-success"><span>{notice}</span><button type="button" className="toast-close" onClick={() => setNotice("")} aria-label="Закрыть уведомление">×</button></div>}
                    {error && <div className="toast-card toast-error" role="alert"><span>{error}</span><button type="button" className="toast-close" onClick={() => setError("")} aria-label="Закрыть ошибку">×</button></div>}
                </div>
            )}

            <footer className="footer glass"><div className="footer-bottom"><p>© 2026 Рент — сервис аренды недвижимости</p></div></footer>
            <AppModals {...appViewProps} />
        </div>
    );
}
