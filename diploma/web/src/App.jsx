import { useMemo, useRef } from "react";
import ImageUploader from "./components/ImageUploader";
import AddressInput from "./components/AddressInput.jsx";
import {
    adminApi,
    adsApi,
    authApi,
    bookingsApi,
    favoritesApi,
    messagesApi,
    reviewsApi,
    storage,
    uploadApi,
    verificationApi
} from "./lib/api";
import { initialDraft, navItems, propertyOptions, roomOptions } from "./shared/appConstants";
import { Field, Metric, Modal, Icon } from "./components/ui";
import { DetailsModal, ListingCard } from "./components/listings/ListingComponents";
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
        handleLogout,
        isLandlord,
        isAdmin,
        notice,
        setNotice,
        error,
        setError
    } = appState;

    const navScrollRef = useRef(null);
    const shortProfileName = useMemo(() => {
        if (!profile?.fullName) {
            return "";
        }
        const parts = profile.fullName.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0];
        }
        return `${parts[0]} ${parts[1]?.charAt(0) || ""}.`.trim();
    }, [profile?.fullName]);
    const isAdminWorkspace = isAdmin && selectedTab === "admin";

    function scrollNav(direction) {
        navScrollRef.current?.scrollBy({
            left: direction * 180,
            behavior: "smooth"
        });
    }

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
        reviewsApi,
        uploadApi,
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

    if (bootstrapping) {
        return <BootScreen {...appViewProps} />;
    }

    if (!profile) {
        return <AuthScreen {...appViewProps} />;
    }

    return (
        <div className="app-shell">
            <header className="topbar glass">
                <div className="brand-lockup">
                    <div className="brand-mark">
                        <img src="/logo.png" alt="Логотип Rent" />
                    </div>
                    <div className="brand-name">Рент</div>
                </div>
                <div className="topbar-nav-shell">
                    <button
                        className="nav-scroll-button"
                        type="button"
                        onClick={() => scrollNav(-1)}
                        title="Прокрутить влево"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M14.5 5 8 12l6.5 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                    <div className="topbar-nav-track" ref={navScrollRef}>
                        <nav className="topbar-nav">
                            {visibleNavItems.map((item) => (
                                <button
                                    key={item.key}
                                    className={selectedTab === item.key ? "active" : ""}
                                    type="button"
                                    onClick={() => setSelectedTab(item.key)}
                                >
                                    {item.label}
                                    {item.key === "messages" && unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                                </button>
                            ))}
                        </nav>
                        <div className="topbar-account">
                            <span className="topbar-user-short">{shortProfileName}</span>
                            <button className="icon-button" type="button" onClick={handleLogout} title="Выйти">
                                <Icon name="logout" />
                            </button>
                        </div>
                    </div>
                    <button
                        className="nav-scroll-button"
                        type="button"
                        onClick={() => scrollNav(1)}
                        title="Прокрутить вправо"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="m9.5 5 6.5 7-6.5 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </header>

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
                    {notice && (
                        <div className="toast-card toast-success">
                            <span>{notice}</span>
                            <button type="button" className="toast-close" onClick={() => setNotice("")} aria-label="Закрыть уведомление">
                                ×
                            </button>
                        </div>
                    )}
                    {error && (
                        <div className="toast-card toast-error" role="alert">
                            <span>{error}</span>
                            <button type="button" className="toast-close" onClick={() => setError("")} aria-label="Закрыть ошибку">
                                ×
                            </button>
                        </div>
                    )}
                </div>
            )}

            <footer className="footer glass">
                <div className="footer-bottom">
                    <p>© 2026 Рент — сервис аренды недвижимости</p>
                </div>
            </footer>

            <AppModals {...appViewProps} />
        </div>
    );
}
