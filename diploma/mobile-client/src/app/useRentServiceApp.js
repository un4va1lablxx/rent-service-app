import { useEffect, useMemo, useRef, useState } from "react";
// Заменяем window.open на нативный модуль для работы со ссылками
import { Linking } from "react-native";
import { API_BASE_URL, adminApi, adsApi, assetUrl, authApi, favoritesApi, messagesApi, messagesSocketApi, notificationsApi, storage, usersApi } from "../lib/api";
import { initialDraft, navItems } from "../shared/appConstants";
import { dialogKey, normalizeInteger, normalizeNumber } from "../shared/formUtils";
import { calculateRentalDuration, formatMoscowDateWords } from "../shared/time";

function createInitialContractModal() {
    return {
        open: false,
        mode: "landlord",
        bookingId: null,
        contractId: null,
        adId: null,
        rentalType: "long_term",
        city: "",
        signingDateText: "",
        address: "",
        areaText: "",
        maxGuestsText: "",
        priceText: "",
        startDate: "",
        endDate: "",
        durationText: "",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        utilitiesIncluded: false,
        deposit: "",
        rules: "",
        landlordCitizenship: "",
        landlordPassportNumber: "",
        landlordPassportIssuedBy: "",
        landlordPassportIssuedAt: "",
        landlordRegistrationAddress: "",
        tenantCitizenship: "",
        tenantPassportNumber: "",
        tenantPassportIssuedBy: "",
        tenantPassportIssuedAt: "",
        tenantRegistrationAddress: "",
        signImmediately: true,
        signConfirmed: true,
        documentUrl: ""
    };
}

function createInitialPaymentModal() {
    return {
        open: false,
        paymentId: null,
        bookingId: null,
        contractId: null,
        status: "pending",
        rentLabel: "",
        depositLabel: "",
        totalLabel: "",
        landlordName: "",
        payoutBankName: "",
        payoutAccountNumberMasked: "",
        cardholderName: "",
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvv: "",
        receiptUrl: ""
    };
}

export function useRentServiceApp() {
    // НАВЕДЕНИЕ ССЫЛОК (РЕФОВ) ВМЕСТО WEB DOM API
    const messageSocketRef = useRef(null);
    const messageSocketReconnectRef = useRef(null);
    const selectedDialogRef = useRef(null);
    const loadDialogsRef = useRef(null);
    const loadDialogMessagesRef = useRef(null);

    // Реф для скролла FlatList/ScrollView (взамен document.querySelector('.messages-container'))
    const chatRef = useRef(null);
    // Массив рефов для инпутов СМС-кода (взамен document.getElementById('code-' + id))
    const resetCodeRefs = useRef([]);

    const [bootstrapping, setBootstrapping] = useState(true);
    const [profile, setProfile] = useState(null);
    const [ads, setAds] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [dialogs, setDialogs] = useState([]);
    const [activeDialogKey, setActiveDialogKey] = useState("");
    const [activeDialogMessages, setActiveDialogMessages] = useState([]);
    const [viewingModal, setViewingModal] = useState({ open: false, date: "", time: "" });
    const [contractModal, setContractModal] = useState(createInitialContractModal);
    const [paymentModal, setPaymentModal] = useState(createInitialPaymentModal);
    const [myAds, setMyAds] = useState([]);
    const [adminStats, setAdminStats] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [moderationAds, setModerationAds] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedTab, setSelectedTab] = useState("discover");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loadingMap, setLoadingMap] = useState({});
    const [search, setSearch] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    const [roomsFilter, setRoomsFilter] = useState("");
    const [propertyFilter, setPropertyFilter] = useState("");
    const [rentalTypeFilter, setRentalTypeFilter] = useState("");
    const [selectedAdId, setSelectedAdId] = useState(null);
    const [selectedAd, setSelectedAd] = useState(null);
    const [favoriteStatusMap, setFavoriteStatusMap] = useState({});
    const [composeText, setComposeText] = useState("");
    const [draftModal, setDraftModal] = useState({ open: false, ad: null });
    const [draft, setDraft] = useState(initialDraft);
    const [authMode, setAuthMode] = useState("login");
    const [phoneNumber, setPhoneNumber] = useState("+7");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [telegramAuth, setTelegramAuth] = useState(null);
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [discoverSort, setDiscoverSort] = useState("rating_desc");
    const [adStatusFilter, setAdStatusFilter] = useState("all");
    const [maxGuestsCount, setMaxGuestsCount] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [adSearchQuery, setAdSearchQuery] = useState("");
    const [usersPage, setUsersPage] = useState(0);
    const [adsPage, setAdsPage] = useState(0);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [blockModal, setBlockModal] = useState({ open: false, user: null });
    const [verificationModal, setVerificationModal] = useState({ open: false, user: null });
    const [moderationModal, setModerationModal] = useState({ open: false, ad: null, step: "view" });
    const [blockReason, setBlockReason] = useState("");
    const [verificationReason, setVerificationReason] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [authView, setAuthView] = useState("form");
    const [resetCode, setResetCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [notificationsUnread, setNotificationsUnread] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [sellerProfileModal, setSellerProfileModal] = useState({ open: false, data: null, loading: false });

    const usersPerPage = 15;
    const adsPerPage = 15;

    const paginatedUsers = (filteredUsers.length ? filteredUsers : adminUsers).slice(usersPage * usersPerPage, (usersPage + 1) * usersPerPage);
    const paginatedModerationAds = (filteredAds.length ? filteredAds : moderationAds).slice(adsPage * adsPerPage, (adsPage + 1) * adsPerPage);
    const usersTotalPages = Math.ceil((filteredUsers.length ? filteredUsers.length : adminUsers.length) / usersPerPage);
    const adsTotalPages = Math.ceil((filteredAds.length ? filteredAds.length : moderationAds.length) / adsPerPage);
    const [searchRentalType, setSearchRentalType] = useState("long_term");
    const [appliedFilters, setAppliedFilters] = useState({
        city: "",
        rooms: "",
        priceMin: 0,
        priceMax: 0,
        maxGuests: 0,
        checkIn: "",
        checkOut: "",
        rentalType: ""
    });

    const isAdmin = profile?.role?.toLowerCase() === "admin";
    const isLandlord = isAdmin || profile?.role?.toLowerCase() === "landlord";
    const visibleNavItems = navItems.filter((item) => {
        if (item.key === "admin") return isAdmin;
        if (item.key === "manage") return isLandlord;
        return true;
    });

    const selectedDialog = useMemo(() => {
        if (!activeDialogKey) return null;
        const existing = dialogs.find((dialog) => dialogKey(dialog) === activeDialogKey);
        return existing || null;
    }, [dialogs, activeDialogKey]);

    const curatedAds = useMemo(() => {
        const filtered = ads.filter((ad) => {
            if (ad.deleted || (ad.moderationStatus || "").toLowerCase() === "deleted") return false;
            if (!ad.active || (ad.moderationStatus || "").toLowerCase() !== "approved") return false;
            if (propertyFilter && ad.propertyType !== propertyFilter) return false;
            if (appliedFilters.city && !ad.city?.toLowerCase().includes(appliedFilters.city.toLowerCase())) return false;
            if (appliedFilters.rooms && String(ad.rooms) !== appliedFilters.rooms) return false;
            const price = ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth;
            if (appliedFilters.priceMin && price < Number(appliedFilters.priceMin)) return false;
            if (appliedFilters.priceMax && price > Number(appliedFilters.priceMax)) return false;
            if (appliedFilters.maxGuests && ad.maxGuests < Number(appliedFilters.maxGuests)) return false;
            if (appliedFilters.rentalType && !ad.rentalType.toLowerCase().includes(appliedFilters.rentalType.toLowerCase())) return false;
            return true;
        });

        return filtered.sort((left, right) => {
            const leftPrice = left.rentalType === "short_term" ? left.pricePerDay || 0 : left.pricePerMonth || 0;
            const rightPrice = right.rentalType === "short_term" ? right.pricePerDay || 0 : right.pricePerMonth || 0;
            const leftRating = left.ownerRating || 0;
            const rightRating = right.ownerRating || 0;

            switch (discoverSort) {
                case "price_asc":
                    return leftPrice - rightPrice;
                case "price_desc":
                    return rightPrice - leftPrice;
                case "recent":
                    return new Date(right.publishedAt || right.createdAt || 0) - new Date(left.publishedAt || left.createdAt || 0);
                case "rating_desc":
                default:
                    if (rightRating !== leftRating) {
                        return rightRating - leftRating;
                    }
                    if ((right.ownerReviewsCount || 0) !== (left.ownerReviewsCount || 0)) {
                        return (right.ownerReviewsCount || 0) - (left.ownerReviewsCount || 0);
                    }
                    return new Date(right.publishedAt || right.createdAt || 0) - new Date(left.publishedAt || left.createdAt || 0);
            }
        });
    }, [ads, appliedFilters, propertyFilter, discoverSort]);

    const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.adId)), [favorites]);

    const [socialLinks, setSocialLinks] = useState({
        telegram: null,
        vk: null
    });
    const [showTelegramConnect, setShowTelegramConnect] = useState(false);
    const [telegramCode, setTelegramCode] = useState("");
    const [telegramConnectStep, setTelegramConnectStep] = useState("input");

    useEffect(() => {
        bootstrap();
    }, []);

    useEffect(() => {
        if (!selectedAdId) {
            setSelectedAd(null);
            return;
        }
        loadAdDetails(selectedAdId);
    }, [selectedAdId]);

    // НАПИСАНА ПОЛНАЯ АДАПТАЦИЯ СКРОЛЛА ПОД REACT NATIVE
    useEffect(() => {
        if (activeDialogMessages.length > 0) {
            // Небольшой таймаут необходим в мобилках, чтобы контент успел отрендериться перед скроллом
            const timeout = setTimeout(() => {
                chatRef.current?.scrollToEnd({ animated: true });
            }, 60);
            return () => clearTimeout(timeout);
        }
    }, [activeDialogMessages]);

    useEffect(() => {
        selectedDialogRef.current = selectedDialog;
    }, [selectedDialog]);

    useEffect(() => {
        if (!selectedDialog?.adId) {
            return;
        }
        if (selectedDialog.otherUserAvatarUrl || selectedDialog.otherUserAvatar || selectedDialog.otherUserPhotoUrl || selectedDialog.avatarUrl) {
            return;
        }

        let cancelled = false;

        async function hydrateDialogAvatar() {
            try {
                const ad = await adsApi.details(selectedDialog.adId);
                const avatarUrl = ad?.ownerAvatarUrl || ad?.ownerAvatar || ad?.ownerPhotoUrl || "";
                if (!avatarUrl || cancelled) {
                    return;
                }
                setDialogs((current) => current.map((dialog) => (
                    dialogKey(dialog) === dialogKey(selectedDialog)
                        ? { ...dialog, otherUserAvatarUrl: assetUrl(avatarUrl) }
                        : dialog
                )));
            } catch {
                // Игнорируем ошибку, оставляем дефолтный аватар
            }
        }

        hydrateDialogAvatar();

        return () => {
            cancelled = true;
        };
    }, [selectedDialog]);

    useEffect(() => {
        loadDialogsRef.current = loadDialogs;
        loadDialogMessagesRef.current = loadDialogMessages;
    });

    useEffect(() => {
        let disposed = false;

        const connect = async () => {
            if (disposed) {
                return;
            }

            const token = await storage.getToken();
            if (!profile?.id || !token) {
                return;
            }

            const socket = await messagesSocketApi.connect();
            if (!socket) {
                return;
            }

            messageSocketRef.current = socket;

            socket.onmessage = async (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.type !== "dialog_updated") {
                        return;
                    }

                    await loadDialogsRef.current?.(true);

                    const currentDialog = selectedDialogRef.current;
                    if (currentDialog && (!payload.adId || Number(payload.adId) === Number(currentDialog.adId))) {
                        await loadDialogMessagesRef.current?.(currentDialog);
                    }
                } catch (err) {
                    console.error("WebSocket update error:", err);
                }
            };

            socket.onerror = (event) => {
                console.error("Message WebSocket error:", event);
            };

            socket.onclose = () => {
                if (disposed) {
                    return;
                }

                messageSocketReconnectRef.current = setTimeout(() => {
                    connect();
                }, 2000);
            };
        };

        connect();

        return () => {
            disposed = true;
            if (messageSocketReconnectRef.current) {
                clearTimeout(messageSocketReconnectRef.current);
                messageSocketReconnectRef.current = null;
            }
            if (messageSocketRef.current) {
                messageSocketRef.current.close();
                messageSocketRef.current = null;
            }
        };
    }, [profile?.id]);

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(() => setNotice(""), 3000);
        return () => clearTimeout(timeout);
    }, [notice]);

    useEffect(() => {
        if (!error) return;
        const timeout = setTimeout(() => setError(""), 4000);
        return () => clearTimeout(timeout);
    }, [error]);

    useEffect(() => {
        if (!telegramAuth?.requestId) return;

        const interval = setInterval(async () => {
            try {
                const status = await authApi.telegramStatus(telegramAuth.requestId);
                if (status?.status === "completed" && status.auth?.token) {
                    await storage.setToken(status.auth.token);
                    const me = await authApi.me();
                    setProfile(me);
                    setTelegramAuth(null);
                    await refreshAll(me);
                } else if (status?.status === "expired") {
                    setError("Срок подтверждения через Telegram изменился или истек.");
                    setTelegramAuth(null);
                }
            } catch (err) {
                setError(err.message);
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [telegramAuth?.requestId]);

    useEffect(() => {
        if (!profile?.id) return;
        loadNotifications();
        const interval = setInterval(() => {
            loadNotifications();
        }, 12000);
        return () => clearInterval(interval);
    }, [profile?.id]);

    useEffect(() => {
        if (profile) {
            setSocialLinks({
                telegram: profile.telegramUsername || null,
                vk: profile.vkUsername || null
            });
        }
    }, [profile]);

    useEffect(() => {
        if (!profile?.id) return;

        let disposed = false;

        const openChatFromUrl = async (url) => {
            if (!url || disposed) return;
            const normalized = url.replace("rentservice://chat?", "rentservice://chat/?");
            const paramsPart = normalized.split("?")[1] || "";
            const params = new URLSearchParams(paramsPart);
            const adId = params.get("adId") || params.get("chatAdId");
            const sellerId = params.get("sellerId");
            if (!adId || !sellerId) return;

            await openDialogFromAd({
                id: Number(adId),
                ownerId: Number(sellerId),
                title: params.get("adTitle") || "Объявление"
            });
        };

        Linking.getInitialURL().then(openChatFromUrl);
        const subscription = Linking.addEventListener("url", ({ url }) => openChatFromUrl(url));

        return () => {
            disposed = true;
            subscription?.remove?.();
        };
    }, [profile?.id]);

    async function bootstrap() {
        if (!await storage.getToken()) {
            setBootstrapping(false);
            return;
        }

        try {
            setError("");
            const me = await authApi.me();
            setProfile(me);
            await refreshAll(me);
        } catch (err) {
            await storage.clearToken();
            setError(err.message);
        } finally {
            setBootstrapping(false);
        }
    }

    async function refreshAll(currentProfile = profile) {
        await Promise.all([
            loadAds(),
            loadFavorites(),
            loadDialogs(),
            loadMyAds(currentProfile),
            loadAdmin(currentProfile),
            loadNotifications()
        ]);
    }

    async function sendTelegramCode(username) {
        try {
            setLoadingMap(prev => ({ ...prev, 'telegram': true }));
            const token = await storage.getToken();
            const response = await fetch(`${API_BASE_URL}/api/telegram/send-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                setNotice("Код подтверждения отправлен в Telegram.");
                setTelegramConnectStep("verify");
                setTelegramCode(username);
            } else {
                const error = await response.json();
                setError(error.message || "Не удалось отправить код");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMap(prev => ({ ...prev, 'telegram': false }));
        }
    }

    async function verifyTelegramCode(code) {
        try {
            const token = await storage.getToken();
            const response = await fetch(`${API_BASE_URL}/api/telegram/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                const me = await authApi.me();
                setProfile(me);
                setShowTelegramConnect(false);
                setTelegramConnectStep("input");
                setTelegramCode("");
                setNotice("Telegram успешно подключен.");
            } else {
                const error = await response.json();
                setError(error.message || "Неверный код");
            }
        } catch (err) {
            setError(err.message);
        }
    }

    async function loadAds(filters = {}) {
        try {
            const data = await adsApi.list(filters);
            const content = data?.content || [];
            setAds(content);
            return content;
        } catch (err) {
            setError(err.message);
            return [];
        }
    }

    async function loadFavorites() {
        try {
            const data = await favoritesApi.list();
            const content = data?.content || [];
            setFavorites(content);
            return content;
        } catch (err) {
            setError(err.message);
            return [];
        }
    }

    async function loadDialogs(preserveSelection = true) {
        try {
            const [dialogsData, unreadData] = await Promise.all([
                messagesApi.dialogs(),
                messagesApi.unreadCount()
            ]);
            const content = dialogsData?.content || [];
            setDialogs(content);
            setUnreadCount(unreadData?.unreadCount || 0);

            if (!preserveSelection && content.length > 0) {
                const key = dialogKey(content[0]);
                setActiveDialogKey(key);
                await loadDialogMessages(content[0]);
            } else if (preserveSelection && content.length > 0 && !activeDialogKey) {
                const key = dialogKey(content[0]);
                setActiveDialogKey(key);
                await loadDialogMessages(content[0]);
            } else if (content.length === 0) {
                setActiveDialogKey("");
                setActiveDialogMessages([]);
            }

            return content;
        } catch (err) {
            console.error("Ошибка загрузки диалогов:", err);
            setError(err.message);
            return [];
        }
    }

    async function loadDialogMessages(dialog) {
        if (!dialog || !dialog.adId || !dialog.otherUserId) {
            setActiveDialogMessages([]);
            return;
        }

        try {
            setBusy("load-messages", true);
            const [data, unreadData] = await Promise.all([
                messagesApi.dialog(dialog.adId, dialog.otherUserId),
                messagesApi.unreadCount()
            ]);
            setActiveDialogMessages(data?.content || []);
            setUnreadCount(unreadData?.unreadCount || 0);
            setDialogs((current) =>
                current.map((item) =>
                    dialogKey(item) === dialogKey(dialog)
                        ? { ...item, unreadCount: 0, lastMessageRead: true }
                        : item
                )
            );
        } catch (err) {
            setError(err.message);
            setActiveDialogMessages([]);
        } finally {
            setBusy("load-messages", false);
        }
    }

    async function loadMyAds(currentProfile = profile) {
        if (!currentProfile || !["landlord", "admin"].includes(currentProfile.role.toLowerCase())) {
            setMyAds([]);
            return [];
        }
        try {
            const data = await adsApi.my();
            const content = data?.content || [];
            setMyAds(content);
            return content;
        } catch (err) {
            setError(err.message);
            return [];
        }
    }

    async function loadAdmin(currentProfile = profile) {
        if (!currentProfile || currentProfile.role.toLowerCase() !== "admin") {
            setAdminStats(null);
            setAdminUsers([]);
            setModerationAds([]);
            return;
        }
        try {
            const [stats, users, allAds] = await Promise.all([
                adminApi.stats(),
                adminApi.users(0, 100),
                adminApi.getAllAds("all", 0, 100)
            ]);
            setAdminStats(stats);
            setAdminUsers(users?.content || []);
            setModerationAds(allAds?.content || []);
        } catch (err) {
            console.error("Ошибка загрузки данных администратора:", err);
            setError(err.message);
        }
    }

    async function loadAdDetails(adId) {
        try {
            const data = await adsApi.details(adId);
            if (data?.deleted || (data?.moderationStatus || "").toLowerCase() === "deleted") {
                setSelectedAdId(null);
                setSelectedAd(null);
                return;
            }
            setSelectedAd((current) => ({ ...data, _viewOnly: current?._viewOnly === true }));
            const status = await favoritesApi.status(adId);
            setFavoriteStatusMap((current) => ({ ...current, [adId]: !!status?.favorite }));
        } catch (err) {
            setSelectedAdId(null);
            setSelectedAd(null);
            setError(err.message);
        }
    }

    function setBusy(key, value) {
        setLoadingMap((current) => ({ ...current, [key]: value }));
    }

    async function filterAdsByStatus(status) {
        setAdStatusFilter(status);
        setAdsPage(0);
        try {
            const data = await adminApi.getAllAds(status, 0, 100);
            setModerationAds(data?.content || []);
            setFilteredAds([]);
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleForgotPassword() {
        if (!phoneNumber.trim()) {
            setError("Введите номер телефона");
            return;
        }
        try {
            setBusy("forgot-send", true);
            setError("");
            setNotice("");
            await authApi.startPasswordReset(phoneNumber.trim());
            setResetCode(["", "", "", "", "", ""]);
            setNewPassword("");
            setAuthView("reset");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("forgot-send", false);
        }
    }

    // НАПИСАНА ПОЛНАЯ АДАПТАЦИЯ ДЛЯ ЦИФРОВЫХ ИНПУТОВ (ФОКУС ВПЕРЕД)
    function handleResetCodeChange(index, value) {
        const digit = value.replace(/\D/g, "").slice(-1);
        const nextCode = [...resetCode];
        nextCode[index] = digit;
        setResetCode(nextCode);

        // Вместо document.getElementById переключаем фокус по массиву ссылок на TextInput
        if (digit && index < 5) {
            resetCodeRefs.current[index + 1]?.focus();
        }
    }

    // ПОЛНАЯ АДАПТАЦИЯ КНОПКИ УДАЛЕНИЯ (ФОКУС НАЗАД)
    function handleResetCodeKeyPress(index, key) {
        // Ловим событие 'Backspace' через нативный проп onKeyPress на инпуте
        if (key === "Backspace" && !resetCode[index] && index > 0) {
            resetCodeRefs.current[index - 1]?.focus();
        }
    }

    async function handlePasswordResetSubmit() {
        try {
            if (resetCode.join("").length !== 6) {
                setError("Введите 6 цифр кода подтверждения");
                return;
            }
            if (newPassword.trim().length < 6) {
                setError("Пароль должен быть не короче 6 символов");
                return;
            }
            setBusy("forgot-confirm", true);
            setError("");
            setNotice("");
            await authApi.confirmPasswordReset({
                phoneNumber: phoneNumber.trim(),
                code: resetCode.join(""),
                newPassword: newPassword.trim()
            });
            setPassword("");
            setNewPassword("");
            setResetCode(["", "", "", "", "", ""]);
            setAuthView("form");
            setAuthMode("login");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("forgot-confirm", false);
        }
    }

    async function handleAuthSubmit() {
        try {
            setBusy("auth", true);
            setError("");
            if (authMode === "register") {
                const response = await authApi.startTelegramRegister({
                    phoneNumber: phoneNumber.trim() === "+7" ? "" : phoneNumber.trim(),
                    fullName: fullName.trim(),
                    password: password.trim()
                });
                setTelegramAuth(response);
                return;
            }
            const response = await authApi.login({
                phoneNumber: phoneNumber.trim(),
                password: password.trim()
            });
            await storage.setToken(response.token);
            const me = await authApi.me();
            setProfile(me);
            await refreshAll(me);
        } catch (err) {
            const msg = err.message || "";
            if (authMode !== "login") {
                setError(msg);
                return;
            }
            if (msg.toLowerCase().includes("не найден") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")) {
                setError("Пользователь с таким номером телефона не существует");
            } else if (msg.toLowerCase().includes("пароль") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("invalid")) {
                setError("Неверный пароль");
            } else {
                setError(msg);
            }
        } finally {
            setBusy("auth", false);
        }
    }

    async function handleTelegramAuth() {
        try {
            setBusy("telegram-auth", true);
            setError("");
            setNotice("");
            const normalizedPhone = phoneNumber.trim() === "+7" ? "" : phoneNumber.trim();
            const payload = {
                phoneNumber: normalizedPhone,
                fullName: fullName.trim(),
                password: password.trim()
            };
            const response = authMode === "register"
                ? await authApi.startTelegramRegister(payload)
                : await authApi.startTelegramLogin(payload);
            setTelegramAuth(response);
            if (response?.botLink) {
                await Linking.openURL(response.botLink);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("telegram-auth", false);
        }
    }

    async function handleLogout() {
        setError("");
        setNotice("");
        await storage.clearToken();
        setProfile(null);
        setAds([]);
        setFavorites([]);
        setDialogs([]);
        setActiveDialogMessages([]);
        setMyAds([]);
        setAdminStats(null);
        setAdminUsers([]);
        setModerationAds([]);
        setUnreadCount(0);
        setSelectedTab("discover");
        setSelectedAdId(null);
    }

    async function handlePromoteToLandlord() {
        try {
            setBusy("role", true);
            setSelectedTab("profile");
            setNotice("Роль обновлена. Теперь можно публиковать объявления.");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("role", false);
        }
    }

    async function handleToggleFavorite(adId) {
        const isFavorite = favoriteIds.has(adId) || favoriteStatusMap[adId];
        try {
            setBusy(`favorite-${adId}`, true);
            if (isFavorite) {
                await favoritesApi.remove(adId);
            } else {
                await favoritesApi.add(adId);
            }
            await loadFavorites();
            setFavoriteStatusMap((current) => ({ ...current, [adId]: !isFavorite }));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`favorite-${adId}`, false);
        }
    }

    function guideLandlordVerification() {
        setSelectedTab("profile");
        setNotice("Чтобы публиковать объявления, сначала пройдите верификацию собственника в профиле.");
    }

    function handleSearchSubmit() {
        const filters = {
            city: cityFilter,
            rooms: roomsFilter,
            priceMin,
            priceMax,
            maxGuests: maxGuestsCount,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            rentalType: searchRentalType
        };

        setAppliedFilters(filters);
        loadAds(filters);
    }

    async function openDialogFromAd(ad) {
        if (!ad || !ad.id || !ad.ownerId) return;

        try {
            setBusy("open-dialog", true);
            setSelectedAdId(null);
            setSelectedAd(null);
            setSelectedTab("messages");

            const tempDialog = {
                adId: ad.id,
                adTitle: ad.title || "Объявление",
                otherUserId: ad.ownerId,
                otherUserAvatarUrl: ad.ownerAvatarUrl || ad.ownerAvatar || ad.ownerPhotoUrl || "",
                otherUserName: ad.ownerName || "Владелец",
                lastMessageText: "",
                unreadCount: 0
            };

            const updatedDialogs = await loadDialogs(false);
            const existingDialog = updatedDialogs.find(
                d => d.adId === ad.id && d.otherUserId === ad.ownerId
            );

            if (existingDialog) {
                setActiveDialogKey(dialogKey(existingDialog));
                await loadDialogMessages(existingDialog);
            } else {
                setActiveDialogKey(dialogKey(tempDialog));
                setActiveDialogMessages([]);
                setDialogs(prev => [tempDialog, ...prev]);
            }

            setComposeText("");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("open-dialog", false);
        }
    }

    async function handleSendMessage() {
        if (!selectedDialog || !composeText.trim()) {
            setError("Не выбран диалог или сообщение пустое");
            return;
        }

        try {
            setBusy("send-message", true);
            await messagesApi.send({
                adId: selectedDialog.adId,
                toUserId: Number(selectedDialog.otherUserId),
                text: composeText.trim()
            });
            setComposeText("");
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message || "Не удалось отправить сообщение");
        } finally {
            setBusy("send-message", false);
        }
    }

    async function handleProposeViewing() {
        if (!selectedDialog || !viewingModal.date || !viewingModal.time) {
            setError("Выберите дату и время просмотра");
            return;
        }

        try {
            setBusy("viewing-propose", true);
            await messagesApi.proposeViewing({
                adId: selectedDialog.adId,
                otherUserId: Number(selectedDialog.otherUserId),
                proposedDateTime: `${viewingModal.date}T${viewingModal.time.length === 5 ? `${viewingModal.time}:00` : viewingModal.time}`
            });
            setViewingModal({ open: false, date: "", time: "" });
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("viewing-propose", false);
        }
    }

    async function handleViewingDecision(messageId, accepted) {
        try {
            setBusy(`viewing-decision-${messageId}`, true);
            await messagesApi.decideViewing(messageId, accepted);
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`viewing-decision-${messageId}`, false);
        }
    }

    async function handleViewingResult(viewingRequestId, confirmed) {
        try {
            setBusy(`viewing-result-${viewingRequestId}`, true);
            const response = await messagesApi.submitViewingResult(viewingRequestId, confirmed);
            if (response?.messageType === "booking_ready") {
                setNotice("");
            } else if (response?.messageType === "viewing_cancelled") {
                setNotice("Оформление после просмотра остановлено.");
            } else {
                setNotice("Ответ сохранен. Ожидаем решение второй стороны.");
            }
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`viewing-result-${viewingRequestId}`, false);
        }
    }

    async function openContractComposer(bookingId, adId) {
        try {
            setBusy("contract-modal", true);
            const ad = await adsApi.details(adId);
            setContractModal({
                ...createInitialContractModal(),
                open: true,
                mode: "landlord",
                bookingId,
                adId,
                landlordCitizenship: profile?.passportCitizenship || "",
                landlordPassportNumber: profile?.passportNumber || "",
                landlordPassportIssuedBy: profile?.passportIssuedBy || "",
                landlordPassportIssuedAt: profile?.passportIssuedAt || "",
                landlordRegistrationAddress: profile?.passportRegistrationAddress || "",
                rentalType: ad.rentalType || "long_term",
                city: ad.city || "",
                signingDateText: formatMoscowDateWords(),
                address: ad.address || "",
                areaText: ad.area ? `${ad.area} кв. м` : "Площадь не указана",
                maxGuestsText: ad.maxGuests ? String(ad.maxGuests) : "Не указано",
                priceText: ad.rentalType === "short_term"
                    ? `${ad.pricePerDay || 0} руб. за сутки`
                    : `${ad.pricePerMonth || 0} руб. в месяц`
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("contract-modal", false);
        }
    }

    async function openTenantContractModal(contractId) {
        try {
            setBusy("contract-modal", true);
            const response = await messagesApi.contractDetails(contractId);
            const snapshot = response?.snapshot || {};
            setContractModal({
                ...createInitialContractModal(),
                open: true,
                mode: "tenant",
                contractId,
                bookingId: response?.bookingId || null,
                tenantCitizenship: profile?.passportCitizenship || "",
                tenantPassportNumber: profile?.passportNumber || "",
                tenantPassportIssuedBy: profile?.passportIssuedBy || "",
                tenantPassportIssuedAt: profile?.passportIssuedAt || "",
                tenantRegistrationAddress: profile?.passportRegistrationAddress || "",
                rentalType: snapshot.rentalType || "long_term",
                city: snapshot.city || "",
                signingDateText: snapshot.signingDateText || formatMoscowDateWords(),
                address: snapshot.address || "",
                areaText: snapshot.areaText || "",
                maxGuestsText: snapshot.maxGuestsText || "",
                priceText: snapshot.priceText || "",
                startDate: snapshot.startDateText || "",
                endDate: snapshot.endDateText || "",
                durationText: snapshot.durationText || "",
                checkInTime: snapshot.checkInTime || "14:00",
                checkOutTime: snapshot.checkOutTime || "12:00",
                utilitiesIncluded: snapshot.utilitiesIncluded === true || snapshot.utilitiesIncluded === "true",
                deposit: snapshot.depositText || "",
                rules: snapshot.rulesText || "",
                documentUrl: assetUrl(response?.documentUrl || ""),
                signConfirmed: true
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("contract-modal", false);
        }
    }

    function updateContractField(field, value) {
        setContractModal((current) => {
            const next = { ...current, [field]: value };
            next.durationText = calculateRentalDuration(next.startDate, next.endDate, next.rentalType);
            return next;
        });
    }

    async function closeContractModal(markAsDeclined = false) {
        const snapshot = contractModal;
        setContractModal(createInitialContractModal());

        if (!markAsDeclined || !snapshot.open) {
            return;
        }

        if (!snapshot.bookingId && !snapshot.contractId) {
            return;
        }

        try {
            setBusy("contract-decline", true);
            await messagesApi.declineContract({
                bookingId: snapshot.bookingId,
                contractId: snapshot.contractId
            });
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("contract-decline", false);
        }
    }

    async function handleCreateContract() {
        try {
            if (!contractModal.signImmediately) {
                setError("Подтвердите подписание договора перед отправкой арендатору");
                return;
            }
            setBusy("contract-create", true);
            const response = await messagesApi.createContract({
                bookingId: contractModal.bookingId,
                startDate: contractModal.startDate,
                endDate: contractModal.endDate,
                deposit: contractModal.deposit.trim(),
                rules: contractModal.rules,
                utilitiesIncluded: contractModal.utilitiesIncluded,
                checkInTime: contractModal.checkInTime,
                checkOutTime: contractModal.checkOutTime,
                landlordCitizenship: contractModal.landlordCitizenship,
                landlordPassportNumber: contractModal.landlordPassportNumber,
                landlordPassportIssuedBy: contractModal.landlordPassportIssuedBy,
                landlordPassportIssuedAt: contractModal.landlordPassportIssuedAt,
                landlordRegistrationAddress: contractModal.landlordRegistrationAddress,
                signImmediately: contractModal.signImmediately
            });
            setContractModal(createInitialContractModal());

            // НАТИВНАЯ АДАПТАЦИЯ ОТКРЫТИЯ ССЫЛКИ ДОГОВОРА В БРАУЗЕРЕ УСТРОЙСТВА
            if (response?.documentUrl) {
                Linking.openURL(assetUrl(response.documentUrl)).catch((err) =>
                    console.error("Не удалось открыть ссылку на документ:", err)
                );
            }

            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("contract-create", false);
        }
    }

    async function handleSignContract(contractId, payload = null) {
        try {
            if (payload) {
                await openTenantContractModal(contractId);
                return;
            }

            if (!contractModal.signConfirmed) {
                setError("Подтвердите подписание договора");
                return;
            }

            setBusy(`contract-sign-${contractId}`, true);
            await messagesApi.signContract(contractId, {
                tenantCitizenship: contractModal.tenantCitizenship,
                tenantPassportNumber: contractModal.tenantPassportNumber,
                tenantPassportIssuedBy: contractModal.tenantPassportIssuedBy,
                tenantPassportIssuedAt: contractModal.tenantPassportIssuedAt,
                tenantRegistrationAddress: contractModal.tenantRegistrationAddress,
                signConfirmed: contractModal.signConfirmed
            });
            setContractModal(createInitialContractModal());
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`contract-sign-${contractId}`, false);
        }
    }

    async function openPaymentModal(paymentId) {
        try {
            setBusy("payment-modal", true);
            const payment = await messagesApi.paymentDetails(paymentId);
            setPaymentModal({
                ...createInitialPaymentModal(),
                open: true,
                paymentId,
                bookingId: payment?.bookingId || null,
                contractId: payment?.contractId || null,
                status: payment?.status || "pending",
                rentLabel: payment?.rentLabel || "",
                depositLabel: payment?.depositLabel || "",
                totalLabel: payment?.totalLabel || "",
                landlordName: payment?.landlordName || "",
                payoutBankName: payment?.payoutBankName || "",
                payoutAccountNumberMasked: payment?.payoutAccountNumberMasked || "",
                receiptUrl: assetUrl(payment?.receiptUrl || "")
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("payment-modal", false);
        }
    }

    function updatePaymentField(field, value) {
        setPaymentModal((current) => ({ ...current, [field]: value }));
    }

    function closePaymentModal() {
        setPaymentModal(createInitialPaymentModal());
    }

    async function handlePaymentSubmit() {
        try {
            setBusy("payment-submit", true);
            const response = await messagesApi.pay(paymentModal.paymentId, {
                cardholderName: paymentModal.cardholderName,
                cardNumber: paymentModal.cardNumber,
                expiryMonth: paymentModal.expiryMonth,
                expiryYear: paymentModal.expiryYear,
                cvv: paymentModal.cvv
            });
            setPaymentModal((current) => ({
                ...current,
                status: response?.status || "paid",
                receiptUrl: assetUrl(response?.receiptUrl || ""),
                totalLabel: response?.totalLabel || current.totalLabel,
                open: true
            }));
            setNotice("Оплата прошла успешно.");
            await loadDialogMessages(selectedDialog);
            await loadDialogs(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("payment-submit", false);
        }
    }

    async function handleSavePayoutDetails(payloadOverride = null) {
        try {
            setBusy("save-payout-details", true);
            const payload = payloadOverride || {
                payoutBankName: profile?.payoutBankName || "",
                payoutAccountNumber: profile?.payoutAccountNumber || ""
            };
            const updated = await authApi.updateMyPaymentDetails(payload);
            setProfile(updated);
            setNotice("Реквизиты для зачисления сохранены.");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("save-payout-details", false);
        }
    }

    async function handleDeletePayoutDetails() {
        try {
            setBusy("delete-payout-details", true);
            const updated = await authApi.deleteMyPaymentDetails();
            setProfile(updated);
            setNotice("Реквизиты удалены.");
        } catch (err) {
            setError(err.message);
        }
    }

    function openDraftModal(ad = null) {
        setDraftModal({ open: true, ad });
        if (ad) {
            setDraft({
                title: ad.title || "",
                description: ad.description || "",
                address: ad.address || "",
                city: ad.city || "",
                district: ad.district || "",
                region: ad.region || "",
                propertyType: ad.propertyType || "apartment",
                rentalType: ad.rentalType || "long_term",
                latitude: ad.latitude ?? "",
                longitude: ad.longitude ?? "",
                rooms: ad.rooms ?? "",
                pricePerMonth: ad.pricePerMonth ?? "",
                pricePerDay: ad.pricePerDay ?? "",
                maxGuests: ad.maxGuests ?? "",
                area: ad.area ?? "",
                floor: ad.floor ?? "",
                totalFloors: ad.totalFloors ?? "",
                photos: (ad.photoUrls || []).map(assetUrl),
            });
        } else {
            setDraft(initialDraft);
        }
    }

    function closeDraftModal() {
        setDraftModal({ open: false, ad: null });
        setDraft(initialDraft);
    }

    async function handleDraftSubmit() {
        try {
            setBusy("save-draft", true);
            if ((draft.photos || []).length > 35) {
                throw new Error("Можно загрузить не более 35 изображений.");
            }
            const payload = {
                title: draft.title.trim(),
                description: draft.description.trim(),
                address: draft.address.trim(),
                city: draft.city.trim(),
                district: draft.district.trim() || null,
                region: draft.region.trim(),
                propertyType: draft.propertyType,
                rentalType: draft.rentalType,
                latitude: normalizeNumber(draft.latitude),
                longitude: normalizeNumber(draft.longitude),
                rooms: normalizeInteger(draft.rooms),
                pricePerMonth: normalizeInteger(draft.pricePerMonth),
                pricePerDay: normalizeInteger(draft.pricePerDay),
                maxGuests: normalizeInteger(draft.maxGuests),
                area: normalizeNumber(draft.area),
                floor: normalizeInteger(draft.floor),
                totalFloors: normalizeInteger(draft.totalFloors),
                photoUrls: (draft.photos || []).map(assetUrl).slice(0, 35)
            };

            if (draftModal.ad?.id) {
                await adsApi.update(draftModal.ad.id, payload);
                setNotice("Объявление обновлено.");
            } else {
                await adsApi.create(payload);
                setNotice("Объявление опубликовано.");
            }

            closeDraftModal();
            await Promise.all([loadMyAds(), loadAds()]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("save-draft", false);
        }
    }

    async function handleToggleAdActive(ad) {
        try {
            setBusy(`toggle-ad-${ad.id}`, true);
            if (ad.active) {
                await adsApi.deactivate(ad.id);
            } else {
                await adsApi.activate(ad.id);
            }
            await Promise.all([loadMyAds(), loadAds()]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`toggle-ad-${ad.id}`, false);
        }
    }

    async function handleDeleteAd(adId) {
        try {
            setBusy(`delete-ad-${adId}`, true);
            await adsApi.remove(adId);
            setNotice("Объявление помечено как удаленное.");
            if (selectedAd?.id === adId) {
                setSelectedAd(null);
                setSelectedAdId(null);
            }
            await Promise.all([loadMyAds(), loadAds()]);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`delete-ad-${adId}`, false);
        }
    }

    async function loadNotifications() {
        try {
            const [list, unread] = await Promise.all([
                notificationsApi.list(),
                notificationsApi.unreadCount()
            ]);
            setNotifications(Array.isArray(list) ? list : []);
            setNotificationsUnread(Number(unread?.unreadCount || 0));
        } catch (err) {
            setError(err.message);
        }
    }

    async function markNotificationRead(notificationId) {
        try {
            const updated = await notificationsApi.markRead(notificationId);
            setNotifications((current) => current.map((item) => item.id === notificationId ? updated : item));
            setNotificationsUnread((current) => Math.max(0, current - 1));
        } catch (err) {
            setError(err.message);
        }
    }

    async function removeNotification(notificationId) {
        try {
            await notificationsApi.remove(notificationId);
            const removed = notifications.find((item) => item.id === notificationId);
            setNotifications((current) => current.filter((item) => item.id !== notificationId));
            if (removed && !removed.read) {
                setNotificationsUnread((current) => Math.max(0, current - 1));
            }
        } catch (err) {
            setError(err.message);
        }
    }

    async function clearNotifications() {
        try {
            await notificationsApi.clear();
            setNotifications([]);
            setNotificationsUnread(0);
        } catch (err) {
            setError(err.message);
        }
    }

    async function openSellerProfile(userId) {
        if (!userId) return;
        try {
            setSellerProfileModal({ open: true, data: null, loading: true });
            const data = await usersApi.publicProfile(userId);
            const visibleAds = (data?.ads || []).filter((item) => !item?.deleted && (item?.moderationStatus || "").toLowerCase() !== "deleted");
            setSellerProfileModal({ open: true, data: { ...data, ads: visibleAds }, loading: false });
        } catch (err) {
            setSellerProfileModal({ open: false, data: null, loading: false });
            setError(err.message);
        }
    }

    async function handleModeration(adId, status) {
        try {
            setBusy(`moderate-${adId}`, true);
            await adminApi.moderateAd(adId, { status, comment: "" });
            await Promise.all([loadAdmin(), loadAds()]);
            setNotice("Статус объявления обновлен.");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`moderate-${adId}`, false);
        }
    }

    async function searchUsers() {
        if (!userSearchQuery.trim()) {
            setFilteredUsers([]);
            setUsersPage(0);
            return;
        }
        const filtered = adminUsers.filter(user =>
            user.fullName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            user.phoneNumber?.includes(userSearchQuery)
        );
        setFilteredUsers(filtered);
        setUsersPage(0);
    }

    async function searchAds() {
        if (!adSearchQuery.trim()) {
            setFilteredAds([]);
            setAdsPage(0);
            return;
        }
        const filtered = moderationAds.filter(ad =>
            ad.title?.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
            ad.city?.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
            ad.userFullName?.toLowerCase().includes(adSearchQuery.toLowerCase())
        );
        setFilteredAds(filtered);
        setAdsPage(0);
    }

    function openBlockModal(user) {
        setBlockReason("");
        setBlockModal({ open: true, user });
    }

    function openVerificationModal(user) {
        if (!user) return;
        setVerificationReason("");
        setVerificationModal({
            open: true,
            user,
            verificationType: (user.verificationStatus || "").toLowerCase() === "trusted_partner" ? "trusted_partner" : "owner_verified",
            revokeOwnerVerification: false
        });
    }

    async function openModerationModal(ad) {
        if (!ad) return;
        setRejectReason("");
        setModerationModal({ open: true, ad, step: "view" });
        try {
            setBusy(`moderation-details-${ad.id}`, true);
            const details = await adminApi.adDetails(ad.id);
            setModerationModal((current) => (
                current.open && current.ad?.id === ad.id
                    ? { ...current, ad: { ...ad, ...details } }
                    : current
            ));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(`moderation-details-${ad.id}`, false);
        }
    }

    async function confirmBlock() {
        const user = blockModal.user;
        if (!user) return;

        try {
            if (user.blocked) {
                await adminApi.updateUserBlock(user.id, false, "");
                setNotice(`Пользователь ${user.fullName} разблокирован`);
            } else {
                if (!blockReason.trim()) {
                    setError("Укажите причину блокировки");
                    return;
                }
                await adminApi.updateUserBlock(user.id, true, blockReason);
                setNotice(`Пользователь ${user.fullName} заблокирован`);
            }
            await loadAdmin(profile);
            setBlockModal({ open: false, user: null });
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmVerification(options = {}) {
        const user = verificationModal.user;
        if (!user) return;

        try {
            const isRemoving = Boolean(user.verified);
            const verificationType = options.verificationType
                || verificationModal.verificationType
                || ((user.verificationStatus || "").toLowerCase() === "trusted_partner" ? "trusted_partner" : "owner_verified");
            const revokeOwnerVerification = Boolean(options.revokeOwnerVerification || verificationModal.revokeOwnerVerification);

            if (isRemoving) {
                const role = (user.role || "").toLowerCase();
                if (role !== "landlord") {
                    setError("Снять верификацию можно только у арендодателей.");
                    return;
                }
            }

            await adminApi.updateUserVerification(
                user.id,
                !isRemoving,
                isRemoving ? verificationType : "owner_verified",
                isRemoving ? revokeOwnerVerification : false
            );
            setNotice(`Верификация пользователя ${user.fullName} ${user.verified ? "снята" : "подтверждена"}`);
            await loadAdmin(profile);
            setVerificationModal({ open: false, user: null });
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmApprove() {
        const ad = moderationModal.ad;
        if (!ad) return;

        try {
            await adminApi.moderateAd(ad.id, { status: "approved", comment: "" });
            setNotice(`Объявление "${ad.title}" одобрено`);
            await loadAdmin(profile);
            setModerationModal({ open: false, ad: null, step: "view" });
        } catch (err) {
            setError(err.message);
        }
    }

    async function confirmReject() {
        const ad = moderationModal.ad;
        if (!ad) return;

        if (!rejectReason.trim()) {
            setError("Укажите причину отклонения");
            return;
        }

        try {
            await adminApi.moderateAd(ad.id, { status: "rejected", comment: rejectReason });
            setNotice(`Объявление "${ad.title}" отклонено`);
            await loadAdmin(profile);
            setModerationModal({ open: false, ad: null, step: "view" });
        } catch (err) {
            setError(err.message);
        }
    }

    return {
        // ВОЗВРАЩАЕМ ДОБАВЛЕННЫЕ НАТИВНЫЕ РЕФЫ
        chatRef,
        resetCodeRefs,
        handleResetCodeKeyPress,
        handleResetCodeKeyDown: (index, event) => handleResetCodeKeyPress(index, event?.key || event?.nativeEvent?.key),

        bootstrapping,
        setBootstrapping,
        profile,
        setProfile,
        ads,
        setAds,
        favorites,
        setFavorites,
        dialogs,
        setDialogs,
        activeDialogKey,
        setActiveDialogKey,
        activeDialogMessages,
        setActiveDialogMessages,
        viewingModal,
        setViewingModal,
        contractModal,
        setContractModal,
        paymentModal,
        setPaymentModal,
        myAds,
        setMyAds,
        adminStats,
        setAdminStats,
        adminUsers,
        setAdminUsers,
        moderationAds,
        setModerationAds,
        unreadCount,
        setUnreadCount,
        selectedTab,
        setSelectedTab,
        error,
        setError,
        notice,
        setNotice,
        loadingMap,
        setLoadingMap,
        search,
        setSearch,
        cityFilter,
        setCityFilter,
        roomsFilter,
        setRoomsFilter,
        propertyFilter,
        setPropertyFilter,
        rentalTypeFilter,
        setRentalTypeFilter,
        selectedAdId,
        setSelectedAdId,
        selectedAd,
        setSelectedAd,
        favoriteStatusMap,
        setFavoriteStatusMap,
        composeText,
        setComposeText,
        draftModal,
        setDraftModal,
        draft,
        setDraft,
        authMode,
        setAuthMode,
        phoneNumber,
        setPhoneNumber,
        fullName,
        setFullName,
        password,
        setPassword,
        telegramAuth,
        setTelegramAuth,
        priceMin,
        setPriceMin,
        priceMax,
        setPriceMax,
        discoverSort,
        setDiscoverSort,
        adStatusFilter,
        setAdStatusFilter,
        maxGuestsCount,
        setMaxGuestsCount,
        checkInDate,
        setCheckInDate,
        checkOutDate,
        setCheckOutDate,
        userSearchQuery,
        setUserSearchQuery,
        adSearchQuery,
        setAdSearchQuery,
        usersPage,
        setUsersPage,
        adsPage,
        setAdsPage,
        filteredUsers,
        setFilteredUsers,
        filteredAds,
        setFilteredAds,
        blockModal,
        setBlockModal,
        verificationModal,
        setVerificationModal,
        moderationModal,
        setModerationModal,
        blockReason,
        setBlockReason,
        verificationReason,
        setVerificationReason,
        rejectReason,
        setRejectReason,
        authView,
        setAuthView,
        resetCode,
        setResetCode,
        newPassword,
        setNewPassword,
        notifications,
        setNotifications,
        notificationsUnread,
        setNotificationsUnread,
        notificationsOpen,
        setNotificationsOpen,
        sellerProfileModal,
        setSellerProfileModal,
        searchRentalType,
        setSearchRentalType,
        appliedFilters,
        setAppliedFilters,
        isAdmin,
        isLandlord,
        visibleNavItems,
        selectedDialog,
        curatedAds,
        favoriteIds,
        socialLinks,
        setSocialLinks,
        showTelegramConnect,
        setShowTelegramConnect,
        telegramCode,
        setTelegramCode,
        telegramConnectStep,
        setTelegramConnectStep,
        paginatedUsers,
        paginatedModerationAds,
        usersTotalPages,
        adsTotalPages,
        usersPerPage,
        adsPerPage,
        bootstrap,
        refreshAll,
        sendTelegramCode,
        verifyTelegramCode,
        loadAds,
        loadFavorites,
        loadDialogs,
        loadDialogMessages,
        loadMyAds,
        loadAdmin,
        loadAdDetails,
        setBusy,
        filterAdsByStatus,
        handleForgotPassword,
        handleResetCodeChange,
        handlePasswordResetSubmit,
        handleAuthSubmit,
        handleTelegramAuth,
        handleLogout,
        handlePromoteToLandlord: guideLandlordVerification,
        handleToggleFavorite,
        handleSearchSubmit,
        openDialogFromAd,
        handleSendMessage,
        handleProposeViewing,
        handleViewingDecision,
        handleViewingResult,
        openContractComposer,
        openTenantContractModal,
        closeContractModal,
        updateContractField,
        handleCreateContract,
        handleSignContract,
        openPaymentModal,
        updatePaymentField,
        closePaymentModal,
        handlePaymentSubmit,
        handleSavePayoutDetails,
        handleDeletePayoutDetails,
        openDraftModal,
        closeDraftModal,
        handleDraftSubmit,
        handleToggleAdActive,
        handleDeleteAd,
        handleModeration,
        loadNotifications,
        markNotificationRead,
        removeNotification,
        clearNotifications,
        openSellerProfile,
        searchUsers,
        searchAds,
        openBlockModal,
        openVerificationModal,
        openModerationModal,
        confirmBlock,
        confirmVerification,
        confirmApprove,
        confirmReject
    };
}
