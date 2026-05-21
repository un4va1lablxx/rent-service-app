import { useEffect, useMemo, useState } from "react";
import ImageUploader from './components/ImageUploader';
import {
    adminApi,
    adsApi,
    authApi,
    favoritesApi,
    messagesApi,
    storage
} from "./lib/api";
import AddressInput from "./components/AddressInput.jsx";

const propertyOptions = [
    { value: "apartment", label: "Квартиры" },
    { value: "house", label: "Дома" }
];

const roomOptions = [
    { value: "", label: "Все" },
    { value: "studio", label: "Студия" },
    { value: "1", label: "1 комната" },
    { value: "2", label: "2 комнаты" },
    { value: "3", label: "3 комнаты" },
    { value: "4", label: "4+ комнаты" },
];

const initialDraft = {
    title: "",
    description: "",
    address: "",
    city: "",
    district: "",
    region: "",
    propertyType: "apartment",
    rentalType: "long_term",
    latitude: "",
    longitude: "",
    rooms: "",
    pricePerMonth: "",
    pricePerDay: "",
    maxGuests: "",
    area: "",
    floor: "",
    totalFloors: "",
    photos: []
};

const navItems = [
    { key: "discover", label: "Обзор" },
    { key: "favorites", label: "Избранное" },
    { key: "messages", label: "Сообщения" },
    { key: "manage", label: "Мои объявления" },
    { key: "profile", label: "Профиль" },
    { key: "admin", label: "Админ" }
];

export default function App() {
    const [bootstrapping, setBootstrapping] = useState(true);
    const [profile, setProfile] = useState(null);
    const [ads, setAds] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [dialogs, setDialogs] = useState([]);
    const [activeDialogKey, setActiveDialogKey] = useState("");
    const [activeDialogMessages, setActiveDialogMessages] = useState([]);
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
    const [smsCode, setSmsCode] = useState("");
    const [debugCode, setDebugCode] = useState("");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    const [adStatusFilter, setAdStatusFilter] = useState("all"); // all, pending, approved, rejected
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

    const usersPerPage = 10;
    const adsPerPage = 10;

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
        return ads.filter((ad) => {
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
    }, [ads, appliedFilters, propertyFilter]);

    const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.adId)), [favorites]);

    const [socialLinks, setSocialLinks] = useState({
        telegram: null,
        vk: null
    });
    const [showTelegramConnect, setShowTelegramConnect] = useState(false);
    const [telegramCode, setTelegramCode] = useState("");
    const [telegramConnectStep, setTelegramConnectStep] = useState("input"); // input или verify

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

    useEffect(() => {
        const messagesContainer = document.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, [activeDialogMessages]);

    useEffect(() => {
        if (!selectedDialog || !activeDialogKey) return;

        const interval = setInterval(async () => {
            try {
                const data = await messagesApi.dialog(selectedDialog.adId, selectedDialog.otherUserId);
                if (JSON.stringify(data?.content) !== JSON.stringify(activeDialogMessages)) {
                    setActiveDialogMessages(data?.content || []);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedDialog?.adId, selectedDialog?.otherUserId, activeDialogMessages, activeDialogKey]);

    useEffect(() => {
        if (!profile) return;

        const interval = setInterval(async () => {
            try {
                const data = await messagesApi.unreadCount();
                setUnreadCount(data?.unreadCount || 0);
            } catch (err) {
                console.error("Unread polling error:", err);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [profile]);

    useEffect(() => {
        if (!notice) return;
        const timeout = window.setTimeout(() => setNotice(""), 3000);
        return () => window.clearTimeout(timeout);
    }, [notice]);

    useEffect(() => {
        if (profile) {
            setSocialLinks({
                telegram: profile.telegramUsername || null,
                vk: profile.vkUsername || null
            });
        }
    }, [profile]);

    async function bootstrap() {
        if (!storage.getToken()) {
            setBootstrapping(false);
            return;
        }

        try {
            setError("");
            const me = await authApi.me();
            setProfile(me);
            await refreshAll(me);
        } catch (err) {
            storage.clearToken();
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
            loadAdmin(currentProfile)
        ]);
    }

    async function sendTelegramCode(username) {
        try {
            setLoadingMap(prev => ({ ...prev, 'telegram': true }));
            const response = await fetch('http://localhost:8080/api/telegram/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storage.getToken()}`
                },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                setNotice("✅ Код подтверждения отправлен в Telegram!");
                setTelegramConnectStep("verify");
                // Сохраняем username для верификации
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
            const response = await fetch('http://localhost:8080/api/telegram/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${storage.getToken()}`
                },
                body: JSON.stringify({ code })
            });

            if (response.ok) {
                // Перезагружаем профиль
                const me = await authApi.me();
                setProfile(me);

                setShowTelegramConnect(false);
                setTelegramConnectStep("input");
                setTelegramCode("");
                setNotice("✅ Telegram успешно подключён!");
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
            const data = await messagesApi.dialog(dialog.adId, dialog.otherUserId);
            setActiveDialogMessages(data?.content || []);
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
            console.log("🟡 Загрузка админ данных...");
            const [stats, users, allAds] = await Promise.all([
                adminApi.stats(),
                adminApi.users(0, 100),
                adminApi.getAllAds("all", 0, 100)  // ← передаём "all"
            ]);
            console.log("📊 Stats:", stats);
            console.log("👥 Users:", users);
            console.log("📋 Все объявления:", allAds);
            setAdminStats(stats);
            setAdminUsers(users?.content || []);
            setModerationAds(allAds?.content || []);
        } catch (err) {
            console.error("❌ Ошибка загрузки админ данных:", err);
            setError(err.message);
        }
    }

    async function loadAdDetails(adId) {
        try {
            const data = await adsApi.details(adId);
            setSelectedAd({ ...data, _viewOnly: false });
            const status = await favoritesApi.status(adId);
            setFavoriteStatusMap((current) => ({ ...current, [adId]: !!status?.favorite }));
        } catch (err) {
            setError(err.message);
        }
    }

    function setBusy(key, value) {
        setLoadingMap((current) => ({ ...current, [key]: value }));
    }

    async function handleRequestCode() {
        try {
            setBusy("sms", true);
            setError("");
            const response = await authApi.requestSmsCode(phoneNumber.trim(), authMode === "register" ? "register" : "login");
            setDebugCode(response?.debugCode || "");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("sms", false);
        }
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

    async function handleAuthSubmit(event) {
        event.preventDefault();
        try {
            setBusy("auth", true);
            setError("");
            const response =
                authMode === "register"
                    ? await authApi.register({
                        phoneNumber: phoneNumber.trim(),
                        fullName: fullName.trim(),
                        smsCode: smsCode.trim()
                    })
                    : await authApi.login({
                        phoneNumber: phoneNumber.trim(),
                        smsCode: smsCode.trim()
                    });

            storage.setToken(response.token);
            const me = await authApi.me();
            setProfile(me);
            await refreshAll(me);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy("auth", false);
        }
    }

    async function handleLogout() {
        setError("");
        setNotice("");
        storage.clearToken();
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
            const nextProfile = await authApi.updateMyRole("landlord");
            setProfile(nextProfile);
            await loadMyAds(nextProfile);
            setSelectedTab("manage");
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

    function handleSearchSubmit(e) {
        e.preventDefault();

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
                photos: ad.photoUrls || [],
            });
        } else {
            setDraft(initialDraft);
        }
    }

    function closeDraftModal() {
        setDraftModal({ open: false, ad: null });
        setDraft(initialDraft);
    }

    async function handleDraftSubmit(event) {
        event.preventDefault();
        try {
            setBusy("save-draft", true);
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
                photoUrls: draft.photos
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

    async function handleModeration(adId, status) {
        try {
            setBusy(`moderate-${adId}`, true);
            await adminApi.moderateAd(adId, { status, comment: "" });
            await Promise.all([loadAdmin(), loadAds()]);
            setNotice("Статус объявления обновлён.");
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
        setVerificationReason("");
        setVerificationModal({ open: true, user });
    }

    function openModerationModal(ad) {
        setRejectReason("");
        setModerationModal({ open: true, ad, step: "view" });
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

    async function confirmVerification() {
        const user = verificationModal.user;
        if (!user) return;

        try {
            // Передаём правильные параметры
            await adminApi.updateUserVerification(user.id, !user.verified, false, false);
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

    if (bootstrapping) {
        return (
            <div className="boot-screen">
                <div className="boot-orb" />
                <div className="boot-card">
                    <span className="eyebrow">Rent Service</span>
                    <h1>Запускаем новый интерфейс</h1>
                    <p>Проверяем сессию и готовим данные.</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="auth-shell">
                <div className="auth-backdrop" />
                <div className="auth-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <section className="auth-card glass" style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
                                {authMode === "login" ? "Вход в систему" : "Регистрация"}
                            </h2>
                        </div>

                        <form className="auth-form" onSubmit={handleAuthSubmit}>
                            <div className="field">
                                <span>Телефон</span>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+7 999 123-45-67"
                                />
                            </div>

                            {authMode === "register" && (
                                <div className="field">
                                    <span>Полное ФИО</span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Иванов Иван Иванович"
                                    />
                                </div>
                            )}

                            <div className="field">
                                <span>SMS-код</span>
                                <div className="inline-field">
                                    <input
                                        type="text"
                                        value={smsCode}
                                        onChange={(e) => setSmsCode(e.target.value)}
                                        placeholder="Введите код из SMS"
                                    />
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        disabled={loadingMap.sms}
                                        onClick={handleRequestCode}
                                    >
                                        {loadingMap.sms ? "..." : "Получить код"}
                                    </button>
                                </div>
                            </div>

                            {debugCode && <div className="notice">Dev-код: {debugCode}</div>}
                            {error && <div className="error-box">{error}</div>}
                            {notice && <div className="notice">{notice}</div>}

                            <button type="submit" className="primary-button" disabled={loadingMap.auth}>
                                {loadingMap.auth ? "Подождите..." : authMode === "register" ? "Создать аккаунт" : "Войти"}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted)' }}>
                            {authMode === "login" ? (
                                <>
                                    Нет аккаунта?{" "}
                                    <button
                                        onClick={() => { setAuthMode("register"); setError(""); setNotice(""); setSmsCode(""); setDebugCode(""); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                    >
                                        Зарегистрироваться
                                    </button>
                                </>
                            ) : (
                                <>
                                    Уже есть аккаунт?{" "}
                                    <button
                                        onClick={() => { setAuthMode("login"); setError(""); setNotice(""); setSmsCode(""); setDebugCode(""); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                    >
                                        Войти
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <header className="topbar glass">
                <div className="brand-lockup">
                    <div className="brand-mark">
                        <img src="/logo.png" alt="Логотип"/>
                    </div>
                    <div className="brand-name">Рент</div>
                </div>
                <nav className="topbar-nav">
                    {visibleNavItems.map((item) => (
                        <button
                            key={item.key}
                            className={selectedTab === item.key ? "active" : ""}
                            onClick={() => setSelectedTab(item.key)}
                        >
                            {item.label}
                            {item.key === "messages" && unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                        </button>
                    ))}
                </nav>

                <div className="topbar-profile">
                    <div>
                        <div className="profile-name">{profile.fullName}</div>
                        <div className="profile-role">{roleLabel(profile.role)}</div>
                    </div>
                    <button className="icon-button" onClick={handleLogout} title="Выйти">
                        <Icon name="logout"/>
                    </button>
                </div>
            </header>

            <main className="page">
                {selectedTab === "discover" && (
                    <>
                        <section className="hero glass">
                            <div className="hero-copy">
                                <h1>
                                    {searchRentalType === "long_term" ? "Долгосрочная аренда" : "Посуточная аренда"}
                                </h1>
                                <p>
                                    {searchRentalType === "long_term"
                                        ? "Снимайте квартиры, дома и студии на месяц, год или дольше."
                                        : "Бронируйте жильё на сутки, выходные или неделю."}
                                </p>
                            </div>
                            <div className="hero-stack">
                                <Metric label="Всего объявлений" value={String(ads.length)}/>
                                <Metric label="Активных" value={String(ads.filter(a => a.active).length)}/>
                                <Metric label="В избранном" value={String(favorites.length)}/>
                            </div>
                        </section>

                        <section className="toolbar glass">
                            <div className="rental-type-switch">
                                <button className={`switch-btn ${searchRentalType === "long_term" ? "active" : ""}`}
                                        onClick={() => setSearchRentalType("long_term")}>
                                    Длительная аренда
                                </button>
                                <button className={`switch-btn ${searchRentalType === "short_term" ? "active" : ""}`}
                                        onClick={() => setSearchRentalType("short_term")}>
                                    Посуточно
                                </button>
                            </div>
                            <form className="search-layout" data-mode={searchRentalType} onSubmit={handleSearchSubmit}>
                                {searchRentalType === "long_term" ? (
                                    <>
                                        <label className="field grow">
                                            <span>Город</span>
                                            <input placeholder="Введите город" value={cityFilter}
                                                   onChange={(e) => setCityFilter(e.target.value)}/>
                                        </label>
                                        <label className="field">
                                            <span>Количество комнат</span>
                                            <select value={roomsFilter}
                                                    onChange={(e) => setRoomsFilter(e.target.value)}>
                                                <option value="">Любое</option>
                                                <option value="1">1 комната</option>
                                                <option value="2">2 комнаты</option>
                                                <option value="3">3 комнаты</option>
                                                <option value="4">4+ комнаты</option>
                                            </select>
                                        </label>
                                        <label className="field">
                                            <span>Цена от</span>
                                            <input type="number" placeholder="от ₽" value={priceMin}
                                                   onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))}
                                                   min="0" step="1000"/>
                                        </label>
                                        <label className="field">
                                            <span>Цена до</span>
                                            <input type="number" placeholder="до ₽" value={priceMax}
                                                   onChange={(e) => setPriceMax(Math.max(0, Number(e.target.value)))}
                                                   min="0" step="1000"/>
                                        </label>
                                        <div className="field field-button">
                                            <button type="submit" className="secondary-button search-button">Найти
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className="field grow">
                                            <span>Город</span>
                                            <input placeholder="Введите город" value={cityFilter}
                                                   onChange={(e) => setCityFilter(e.target.value)}/>
                                        </label>
                                        <label className="field">
                                            <span>Гостей</span>
                                            <input type="number" placeholder="Количество гостей" value={maxGuestsCount}
                                                   onChange={(e) => setMaxGuestsCount(Number(e.target.value))} min="1"/>
                                        </label>
                                        <label className="field">
                                            <span>Цена от (₽/сутки)</span>
                                            <input type="number" placeholder="от" value={priceMin}
                                                   onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))}
                                                   min="0" step="500"/>
                                        </label>
                                        <label className="field">
                                            <span>Цена до (₽/сутки)</span>
                                            <input type="number" placeholder="до" value={priceMax}
                                                   onChange={(e) => setPriceMax(Math.max(0, Number(e.target.value)))}
                                                   min="0" step="500"/>
                                        </label>
                                        <label className="field">
                                            <span>Даты</span>
                                            <div className="date-range">
                                                <input type="date" value={checkInDate}
                                                       onChange={(e) => setCheckInDate(e.target.value)}/>
                                                <span>→</span>
                                                <input type="date" value={checkOutDate}
                                                       onChange={(e) => setCheckOutDate(e.target.value)}/>
                                            </div>
                                        </label>
                                        <div className="field field-button">
                                            <button type="submit" className="secondary-button search-button">Найти
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>

                            <div className="segmented">
                                <button className={!propertyFilter ? "active" : ""}
                                        onClick={() => setPropertyFilter("")}>Всё
                                </button>
                                {propertyOptions.map((option) => (
                                    <button key={option.value}
                                            className={propertyFilter === option.value ? "active" : ""}
                                            onClick={() => setPropertyFilter(option.value)}>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="card-grid">
                            {curatedAds.map((ad) => (
                                <ListingCard
                                    key={ad.id}
                                    ad={ad}
                                    onOpen={setSelectedAdId}
                                    onToggleFavorite={handleToggleFavorite}
                                    isFavorite={favoriteIds.has(ad.id) || favoriteStatusMap[ad.id]}
                                    loading={loadingMap[`favorite-${ad.id}`]}
                                />
                            ))}
                        </section>

                        {!curatedAds.length && (
                            <section className="empty-state glass">
                                <h3>Подходящих объявлений пока нет</h3>
                                <p>Попробуйте изменить город, комнаты или убрать часть фильтров.</p>
                            </section>
                        )}
                    </>
                )}

                {selectedTab === "favorites" && (
                    <section className="stack-section">
                        {favorites.length === 0 ? (
                            <div className="empty-favorites glass">
                                <div className="empty-icon">❤️</div>
                                <h3>Избранное пока пусто</h3>
                                <p>Добавляйте понравившиеся объявления в избранное, чтобы не потерять их.</p>
                                <button
                                    className="primary-button"
                                    onClick={() => setSelectedTab("discover")}
                                >
                                    Перейти к объявлениям
                                </button>
                            </div>
                        ) : (
                            <div className="card-grid">
                                {favorites.map((item) => (
                                    <article key={item.id} className="listing-card glass compact">
                                        <img
                                            src={item.ad.primaryPhotoUrl || fallbackImage(item.ad.propertyType)}
                                            alt={item.ad.title}
                                            className="listing-cover"
                                        />
                                        <div className="listing-content">
                                            <h3>{item.ad.title}</h3>
                                            <p className="listing-price">
                                                {formatPriceWithType(
                                                    item.ad.rentalType === "short_term" ? item.ad.pricePerDay : item.ad.pricePerMonth,
                                                    item.ad.rentalType
                                                )}
                                            </p>
                                            <p className="listing-meta">{item.ad.city}</p>
                                            <div className="actions-row">
                                                <button className="secondary-button"
                                                        onClick={() => setSelectedAdId(item.adId)}>
                                                    Открыть
                                                </button>
                                                <button className="ghost-button"
                                                        onClick={() => handleToggleFavorite(item.adId)}>
                                                    Убрать
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {selectedTab === "messages" && (
                    <div className="messages-container">
                        <div className="dialogs-sidebar">
                            <div className="dialogs-header">
                                <h2>Сообщения</h2>
                                {dialogs.length > 0 && <span className="dialogs-count">{dialogs.length}</span>}
                            </div>

                            <div className="dialogs-list">
                                {dialogs.length === 0 ? (
                                    <div className="empty-dialogs">
                                        <div className="empty-icon">💬</div>
                                        <p>Нет диалогов</p>
                                        <span>Напишите владельцу объявления, чтобы начать общение</span>
                                    </div>
                                ) : (
                                    dialogs.map((dialog) => (
                                        <div
                                            key={dialogKey(dialog)}
                                            className={`dialog-item ${activeDialogKey === dialogKey(dialog) ? "active" : ""}`}
                                            onClick={() => {
                                                setActiveDialogKey(dialogKey(dialog));
                                                loadDialogMessages(dialog);
                                            }}
                                        >
                                            <div className="dialog-avatar">
                                                <div className="avatar-placeholder">
                                                    {dialog.otherUserName?.charAt(0) || "П"}
                                                </div>
                                            </div>
                                            <div className="dialog-info">
                                                <div className="dialog-name-row">
                                                    <span className="dialog-name">{dialog.otherUserName}</span>
                                                    {dialog.unreadCount > 0 && (
                                                        <span className="dialog-badge">{dialog.unreadCount}</span>
                                                    )}
                                                </div>
                                                <span
                                                    className="dialog-preview">{dialog.lastMessageText || "Начните диалог"}</span>
                                                <span className="dialog-ad-title">{dialog.adTitle}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="chat-area">
                            {!activeDialogKey || !selectedDialog ? (
                                <div className="chat-placeholder">
                                    <div className="placeholder-icon">💬</div>
                                    <h3>Выберите чат</h3>
                                    <p>Нажмите на диалог слева, чтобы начать общение</p>
                                </div>
                            ) : (
                                <>
                                    <div className="chat-header">
                                        <div className="chat-user-info">
                                            <div className="chat-avatar">
                                                {selectedDialog?.otherUserName?.charAt(0) || "П"}
                                            </div>
                                            <div>
                                                <h3>{selectedDialog?.otherUserName}</h3>
                                                <button
                                                    className="chat-ad-link"
                                                    onClick={async () => {
                                                        const ad = await adsApi.details(selectedDialog.adId);
                                                        setSelectedAd({...ad, _viewOnly: true});
                                                        setSelectedAdId(selectedDialog.adId);
                                                    }}
                                                >
                                                    {selectedDialog?.adTitle} →
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="chat-messages">
                                        {activeDialogMessages.length === 0 ? (
                                            <div className="chat-welcome">
                                                <div className="welcome-icon">💬</div>
                                                <p>Нет сообщений</p>
                                                <span>Напишите первое сообщение</span>
                                            </div>
                                        ) : (
                                            groupMessagesByDay(activeDialogMessages).map((group, groupIdx) => (
                                                <div key={groupIdx}>
                                                    <div className="messages-date-separator">
                                                        <span>{group.day}</span>
                                                    </div>
                                                    {group.messages.map((message) => (
                                                        <div
                                                            key={message.id}
                                                            className={`chat-message ${message.fromUserId === profile.id ? "outgoing" : "incoming"}`}
                                                        >
                                                            <div className="message-bubble">
                                                                <div className="message-text">{message.text}</div>
                                                                <div className="message-footer">
                                            <span className="message-time">
                                                {new Date(message.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                                                    {message.fromUserId === profile.id && (
                                                                        <span className="message-status">
                                                    {message.read ? (
                                                        <svg className="status-icon status-read" viewBox="0 0 18 18"
                                                             width="16" height="16">
                                                            <path d="M1 9l4 4L12 4" stroke="currentColor"
                                                                  strokeWidth="2" fill="none" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                            <path d="M5 9l4 4 7-9" stroke="currentColor" strokeWidth="2"
                                                                  fill="none" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                        </svg>
                                                    ) : message.deliveredAt ? (
                                                        <svg className="status-icon status-delivered"
                                                             viewBox="0 0 18 18" width="16" height="16">
                                                            <path d="M1 9l4 4L12 4" stroke="currentColor"
                                                                  strokeWidth="2" fill="none" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                            <path d="M5 9l4 4 7-9" stroke="currentColor" strokeWidth="2"
                                                                  fill="none" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                        </svg>
                                                    ) : (
                                                        <svg className="status-icon status-sent" viewBox="0 0 18 18"
                                                             width="16" height="16">
                                                            <path d="M3 9l4 4L15 4" stroke="currentColor"
                                                                  strokeWidth="2" fill="none" strokeLinecap="round"
                                                                  strokeLinejoin="round"/>
                                                        </svg>
                                                    )}
                                                </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
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
                        onChange={(e) => {
                            setComposeText(e.target.value);
                            autoResizeTextarea(e.target);
                        }}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                                setTimeout(() => {
                                    if (e.target) {
                                        e.target.style.height = 'auto';
                                    }
                                }, 0);
                            }
                        }}
                        rows={1}
                    />
                                            <button
                                                className="icon-button send-button"
                                                onClick={handleSendMessage}
                                                disabled={loadingMap["send-message"] || !composeText.trim()}
                                                title="Отправить"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <path
                                                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
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
                        </div>

                    </div>
                )}

                {selectedTab === "manage" && isLandlord && (
                    <section className="stack-section">
                        <div className="hero glass">
                            <div className="hero-copy">
                                <h1>Мои объявления</h1>
                                <p>Публикуйте, редактируйте и управляйте своими объявлениями</p>
                            </div>
                            <div className="hero-stack">
                                <button className="primary-button" onClick={() => openDraftModal()}>
                                    + Новое объявление
                                </button>
                            </div>
                        </div>

                        <div className="manage-grid">
                            {myAds.length === 0 ? (
                                <div className="empty-state glass">
                                    <div className="empty-icon">📦</div>
                                    <h3>У вас пока нет объявлений</h3>
                                    <p>Создайте первое объявление, чтобы начать сдавать недвижимость</p>
                                    <button className="primary-button" onClick={() => openDraftModal()}>
                                        Создать объявление
                                    </button>
                                </div>
                            ) : (
                                myAds.map((ad) => (
                                    <article className="manage-card glass" key={ad.id}>
                                        <img
                                            src={ad.primaryPhotoUrl || fallbackImage(ad.propertyType)}
                                            alt={ad.title}
                                            className="manage-cover"
                                        />
                                        <div className="manage-body">
                                            <div>
                                                <h3>{ad.title}</h3>
                                                <p>{ad.city}</p>
                                            </div>
                                            <div className="pill-row">
                                                <span className="pill">{statusLabel(ad.moderationStatus)}</span>
                                                <span className="pill">{ad.active ? "Активно" : "Отключено"}</span>
                                            </div>
                                            <div className="actions-row">
                                                <button
                                                    className="secondary-button"
                                                    onClick={async () => {
                                                        const details = await adsApi.details(ad.id);
                                                        openDraftModal(details);
                                                    }}
                                                >
                                                    Изменить
                                                </button>
                                                <button className="ghost-button" onClick={() => handleToggleAdActive(ad)}>
                                                    {ad.active ? "Снять" : "Вернуть"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {selectedTab === "profile" && (
                    <div className="profile-layout">
                        {/* Левая колонка - Аккаунт (60%) */}
                        <div className="profile-main glass">
                            <div className="profile-header">
                                <span className="eyebrow">Аккаунт</span>
                                <div className="profile-name-section">
                                    <div className="profile-avatar">
                                        {profile.fullName?.charAt(0) || "П"}
                                    </div>
                                    <div className="profile-name-details">
                                        <h2>{profile.fullName}</h2>
                                        <p>{profile.phoneNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Роль</span>
                                    <span className="stat-value">{roleLabel(profile.role)}</span>
                                </div>
                                {profile.verified && (
                                    <div className="stat-item">
                                        <span className="stat-label">Статус</span>
                                        <span className="stat-value verified">Верифицирован ✓</span>
                                    </div>
                                )}
                                {profile.smsVerified && (
                                    <div className="stat-item">
                                        <span className="stat-label">SMS</span>
                                        <span className="stat-value">Подтверждён</span>
                                    </div>
                                )}
                            </div>

                            <div className="profile-divider" />

                            <div className="profile-social">
                                <h3>Социальные сети</h3>
                                <div className="social-links">
                                    <div className="social-item">
                                        <img className="social-icon" src="/telegram.png" alt="Telegram" width="22"
                                             height="22"/>
                                        <div className="social-info">
                                            <span className="social-label">Telegram</span>
                                            {profile?.telegramId ? (
                                                <a
                                                    href={`https://t.me/${profile.telegramUsername || profile.telegramId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="social-link"
                                                >
                                                    Подключён ✓
                                                </a>
                                            ) : (
                                                <button
                                                    className="social-connect-btn"
                                                    onClick={() => setShowTelegramConnect(true)}
                                                >
                                                    + Подключить
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="social-item disabled">
                                        <img className="social-icon" src="/max.svg" alt="МАКС" width="22" height="22"/>
                                        <div className="social-info">
                                            <span className="social-label">MAX (В разработке)</span>
                                            <span className="social-status soon">Скоро</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Правая колонка - Действия (40%) */}
                        <div className="profile-actions-panel glass">
                            <div className="actions-header">
                                <span className="eyebrow">Действия</span>
                                <h3>Управление аккаунтом</h3>
                            </div>
                            <div className="actions-list">
                                {!isLandlord && (
                                    <button
                                        className="action-button primary-action"
                                        disabled={loadingMap.role}
                                        onClick={handlePromoteToLandlord}
                                    >
                                        <span className="action-icon">🏠</span>
                                        <div className="action-text">
                                            <strong>Стать арендодателем</strong>
                                            <small>Получите возможность публиковать объявления</small>
                                        </div>
                                    </button>
                                )}
                                {isLandlord && (
                                    <button
                                        className="action-button"
                                        onClick={() => setSelectedTab("manage")}
                                    >
                                        <span className="action-icon">📋</span>
                                        <div className="action-text">
                                            <strong>Мои объявления</strong>
                                            <small>Управление публикациями</small>
                                        </div>
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        className="action-button"
                                        onClick={() => setSelectedTab("admin")}
                                    >
                                        <span className="action-icon">⚙️</span>
                                        <div className="action-text">
                                            <strong>Админ-панель</strong>
                                            <small>Модерация и управление</small>
                                        </div>
                                    </button>
                                )}
                                <button className="action-button danger" onClick={handleLogout}>
                                    <span className="action-icon">🚪</span>
                                    <div className="action-text">
                                        <strong>Выйти</strong>
                                        <small>Завершить сессию</small>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Модалка подключения Telegram */}
                {showTelegramConnect && (
                    <Modal onClose={() => {
                        setShowTelegramConnect(false);
                        setTelegramConnectStep("input");
                        setTelegramCode("");
                    }}>
                        <div className="telegram-connect-modal">
                            <h3>Подключение Telegram</h3>
                            {telegramConnectStep === "input" ? (
                                <>
                                    <p>Введите ваш username в Telegram (без @):</p>
                                    <input
                                        type="text"
                                        placeholder="username"
                                        value={telegramCode}
                                        onChange={(e) => setTelegramCode(e.target.value)}
                                        className="telegram-input"
                                    />
                                    <button
                                        className="primary-button"
                                        onClick={() => {
                                            if (telegramCode.trim()) {
                                                sendTelegramCode(telegramCode);
                                            }
                                        }}
                                        disabled={loadingMap['telegram']}
                                    >
                                        {loadingMap['telegram'] ? "Отправка..." : "Отправить код подтверждения"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p>Введите код, который пришёл в Telegram:</p>
                                    <input
                                        type="text"
                                        placeholder="Код подтверждения"
                                        value={telegramCode}
                                        onChange={(e) => setTelegramCode(e.target.value)}
                                        className="telegram-input"
                                    />
                                    <button
                                        className="primary-button"
                                        onClick={() => verifyTelegramCode(telegramCode)}
                                    >
                                        Подтвердить
                                    </button>
                                </>
                            )}
                        </div>
                    </Modal>
                )}

                {selectedTab === "admin" && isAdmin && (
                    <div className="admin-container">
                        {/* Островок заголовка */}
                        <div className="admin-header glass">
                            <h1>Админ-панель</h1>
                            <p>Управление пользователями и модерация объявлений</p>
                        </div>

                        {/* Островок статистики */}
                        <div className="stats-container glass">
                            <h3>Статистика</h3>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <span className="stat-label">Пользователи</span>
                                    <strong>{adminStats?.usersCount || 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Объявления</span>
                                    <strong>{adminStats?.adsCount || 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Одобрено</span>
                                    <strong>{adminStats?.activeAdsCount || 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">На модерации</span>
                                    <strong>{adminStats?.pendingAdsCount || 0}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Верифицированы</span>
                                    <strong>{adminUsers.filter(u => u.verified).length}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Не верифицированы</span>
                                    <strong>{adminUsers.filter(u => !u.verified).length}</strong>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-label">Заблокированы</span>
                                    <strong>{adminUsers.filter(u => u.blocked).length}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Островок управления пользователями */}
                        <div className="users-container glass">
                            <div className="section-header">
                                <div className="header-title">
                                    <span className="header-icon">👥</span>
                                    <h3>Модерация пользователей</h3>
                                </div>
                                <div className="search-box">
                                    <input
                                        type="text"
                                        placeholder="Поиск по ФИО или телефону..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                    <button className="search-btn" onClick={() => searchUsers()}>🔍 Найти</button>
                                </div>
                            </div>

                            <div className="users-table">
                                <table>
                                    <thead>
                                    <tr><th>ID</th><th>ФИО</th><th>Телефон</th><th>Роль</th><th>Верифицирован</th><th>Статус</th><th>Действия</th></tr>
                                    </thead>
                                    <tbody>
                                    {paginatedUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.fullName}</td>
                                            <td>{user.phoneNumber}</td>
                                            <td>{roleLabel(user.role)}</td>
                                            <td>{user.verified ? <span className="badge success">Да</span> : <span className="badge muted">Нет</span>}</td>
                                            <td>{user.blocked ? <span className="badge danger">Заблокирован</span> : <span className="badge success">Активен</span>}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className="small-btn secondary"
                                                    onClick={() => openVerificationModal(user)}
                                                    disabled={user.blocked}
                                                >
                                                    {user.verified ? "Снять верификацию" : "Верифицировать"}
                                                </button>
                                                <button
                                                    className="small-btn danger"
                                                    onClick={() => openBlockModal(user)}
                                                >
                                                    {user.blocked ? "Разблокировать" : "Заблокировать"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Пагинация пользователей */}
                            {usersTotalPages > 1 && (
                                <div className="pagination">
                                    <button onClick={() => setUsersPage(Math.max(0, usersPage - 1))} disabled={usersPage === 0}>←</button>
                                    <span>Страница {usersPage + 1} из {usersTotalPages}</span>
                                    <button onClick={() => setUsersPage(Math.min(usersTotalPages - 1, usersPage + 1))} disabled={usersPage === usersTotalPages - 1}>→</button>
                                </div>
                            )}
                        </div>

                        {/* Островок модерации объявлений */}
                        <div className="moderation-container glass">
                            <div className="section-header">
                                <div className="header-title">
                                    <span className="header-icon">📋</span>
                                    <h3>Модерация объявлений</h3>
                                </div>
                                <div className="search-box">
                                    <input
                                        type="text"
                                        placeholder="Поиск по названию или городу..."
                                        value={adSearchQuery}
                                        onChange={(e) => setAdSearchQuery(e.target.value)}
                                        className="search-input"
                                    />
                                    <button className="search-btn" onClick={() => searchAds()}>🔍 Найти</button>
                                </div>
                            </div>

                            <div className="status-filter">
                                <button className={adStatusFilter === "all" ? "active" : ""}
                                        onClick={() => filterAdsByStatus("all")}>Все
                                </button>
                                <button className={adStatusFilter === "pending" ? "active" : ""}
                                        onClick={() => filterAdsByStatus("pending")}>На модерации
                                </button>
                                <button className={adStatusFilter === "approved" ? "active" : ""}
                                        onClick={() => filterAdsByStatus("approved")}>Одобренные
                                </button>
                                <button className={adStatusFilter === "rejected" ? "active" : ""}
                                        onClick={() => filterAdsByStatus("rejected")}>Отклонённые
                                </button>
                            </div>
                            <div className="ads-table">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>№</th>
                                        <th>Название</th>
                                        <th>Владелец</th>
                                        <th>Город</th>
                                        <th>Телефон</th>
                                        <th>Цена</th>
                                        <th>Действия</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paginatedModerationAds.map((ad, idx) => (
                                        <tr key={ad.id}>
                                            <td>{idx + 1 + adsPage * 10}</td>
                                            <td>{ad.title}</td>
                                            <td>{ad.userFullName || "Неизвестно"}</td>
                                            <td>{ad.city}</td>
                                            <td>{ad.userPhone || "—"}</td>
                                            <td>{formatMoney(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth)}</td>
                                            <td className="actions-cell">
                                                <button className="small-btn primary"
                                                        onClick={() => openModerationModal(ad)}>Подробнее
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Пагинация объявлений */}
                            {adsTotalPages > 1 && (
                                <div className="pagination">
                                    <button onClick={() => setAdsPage(Math.max(0, adsPage - 1))}
                                            disabled={adsPage === 0}>←
                                    </button>
                                    <span>Страница {adsPage + 1} из {adsTotalPages}</span>
                                    <button onClick={() => setAdsPage(Math.min(adsTotalPages - 1, adsPage + 1))}
                                            disabled={adsPage === adsTotalPages - 1}>→
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Модалка блокировки пользователя */}
                {blockModal.open && (
                    <Modal onClose={() => setBlockModal({open: false, user: null})}>
                        <div className="admin-modal">
                            <h3>{blockModal.user?.blocked ? "Разблокировка пользователя" : "Блокировка пользователя"}</h3>
                            <p>Пользователь: <strong>{blockModal.user?.fullName}</strong></p>
                            <p>Телефон: {blockModal.user?.phoneNumber}</p>
                            {!blockModal.user?.blocked && (
                                <textarea
                                    className="reason-input"
                                    placeholder="Причина блокировки..."
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    rows={3}
                                />
                            )}
                            <div className="modal-actions">
                                <button className="secondary-button" onClick={() => setBlockModal({ open: false, user: null })}>Отмена</button>
                                <button className="danger-button" onClick={() => confirmBlock()}>
                                    {blockModal.user?.blocked ? "Разблокировать" : "Заблокировать"}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Модалка верификации пользователя */}
                {verificationModal.open && (
                    <Modal onClose={() => setVerificationModal({ open: false, user: null })}>
                        <div className="admin-modal">
                            <h3>{verificationModal.user?.verified ? "Снятие верификации" : "Верификация пользователя"}</h3>
                            <p>Пользователь: <strong>{verificationModal.user?.fullName}</strong></p>
                            <p>Телефон: {verificationModal.user?.phoneNumber}</p>
                            {verificationModal.user?.verified && (
                                <textarea
                                    className="reason-input"
                                    placeholder="Причина снятия верификации..."
                                    value={verificationReason}
                                    onChange={(e) => setVerificationReason(e.target.value)}
                                    rows={3}
                                />
                            )}
                            <div className="modal-actions">
                                <button className="secondary-button" onClick={() => setVerificationModal({ open: false, user: null })}>Отмена</button>
                                <button className="primary-button" onClick={() => confirmVerification()}>
                                    {verificationModal.user?.verified ? "Снять верификацию" : "Верифицировать"}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Модалка модерации объявления */}
                {moderationModal.open && (
                    <Modal onClose={() => setModerationModal({ open: false, ad: null, step: "view" })}>
                        <div className="admin-modal wide">
                            <h3>Модерация объявления</h3>
                            <div className="ad-details">
                                <p><strong>Название:</strong> {moderationModal.ad?.title}</p>
                                <p><strong>Описание:</strong> {moderationModal.ad?.description || "—"}</p>
                                <p><strong>Город:</strong> {moderationModal.ad?.city}</p>
                                <p><strong>Адрес:</strong> {moderationModal.ad?.address}</p>
                                <p><strong>Владелец:</strong> {moderationModal.ad?.userFullName}</p>
                                <p><strong>Телефон:</strong> {moderationModal.ad?.userPhone}</p>
                                <p><strong>Цена:</strong> {formatMoney(moderationModal.ad?.rentalType === "short_term" ? moderationModal.ad?.pricePerDay : moderationModal.ad?.pricePerMonth)}</p>
                                {moderationModal.ad?.maxGuests && <p><strong>Макс. гостей:</strong> {moderationModal.ad?.maxGuests}</p>}
                                {moderationModal.ad?.rooms && <p><strong>Комнаты:</strong> {moderationModal.ad?.rooms}</p>}
                            </div>

                            {moderationModal.step === "reject" && (
                                <textarea
                                    className="reason-input"
                                    placeholder="Причина отклонения..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={3}
                                />
                            )}

                            <div className="modal-actions">
                                {moderationModal.step === "view" && (
                                    <button className="secondary-button" onClick={() => setModerationModal({ open: false, ad: null, step: "view" })}>Отмена</button>
                                )}
                                {moderationModal.step === "view" && (
                                    <button className="danger-button" onClick={() => setModerationModal(prev => ({ ...prev, step: "reject" }))}>Отклонить</button>
                                )}
                                {moderationModal.step === "reject" && (
                                    <button className="danger-button" onClick={() => confirmReject()}>Подтвердить отклонение</button>
                                )}
                                <button className="primary-button" onClick={() => confirmApprove()}>Одобрить</button>
                            </div>
                        </div>
                    </Modal>
                )}
            </main>

            <footer className="footer glass">
                <div className="footer-bottom">
                    <p>© 2026 Рент — сервис аренды недвижимости</p>
                </div>
            </footer>

            {selectedAd && (
                <DetailsModal
                    ad={selectedAd}
                    onClose={() => setSelectedAdId(null)}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favoriteIds.has(selectedAd.id) || favoriteStatusMap[selectedAd.id]}
                    loading={loadingMap[`favorite-${selectedAd.id}`]}
                    onOpenDialog={openDialogFromAd}
                    hideActions={selectedAd._viewOnly === true}
                />
            )}

            {draftModal.open && (
                <Modal onClose={closeDraftModal} wide>
                    <form className="draft-form" onSubmit={handleDraftSubmit}>
                        <div className="section-heading with-action">
                            <div>
                                <h2>{draftModal.ad ? "Редактирование объявления" : "Новое объявление"}</h2>
                                <p>Форма сделана широкой и спокойной, без перегруженных боковых панелей.</p>
                            </div>
                            <button type="submit" className="primary-button" disabled={loadingMap["save-draft"]}>
                                {loadingMap["save-draft"] ? "Сохраняем..." : "Сохранить"}
                            </button>
                        </div>

                        <div className="draft-grid">
                            <Field label="Название">
                                <input value={draft.title}
                                       onChange={(e) => setDraft({...draft, title: e.target.value})}/>
                            </Field>
                            <Field label="Тип жилья">
                                <select value={draft.propertyType}
                                        onChange={(e) => setDraft({...draft, propertyType: e.target.value})}>
                                    {propertyOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Тип аренды">
                                <div className="segmented">
                                    <button type="button" className={draft.rentalType === "long_term" ? "active" : ""}
                                            onClick={() => setDraft({...draft, rentalType: "long_term"})}>Долгосрочно
                                    </button>
                                    <button type="button" className={draft.rentalType === "short_term" ? "active" : ""}
                                            onClick={() => setDraft({...draft, rentalType: "short_term"})}>Посуточно
                                    </button>
                                </div>
                            </Field>
                            <Field label="Город">
                                <input value={draft.city} onChange={(e) => setDraft({...draft, city: e.target.value})}/>
                            </Field>
                            <Field label="Район">
                                <input value={draft.district}
                                       onChange={(e) => setDraft({...draft, district: e.target.value})}/>
                            </Field>
                            <Field label="Регион">
                                <input value={draft.region}
                                       onChange={(e) => setDraft({...draft, region: e.target.value})}/>
                            </Field>
                            <Field label="Адрес">
                                <AddressInput
                                    value={draft.address}
                                    onChange={(val) => setDraft({...draft, address: val})}
                                    placeholder="Введите адрес"
                                />
                            </Field>
                            {draft.rentalType === "long_term" ? (
                                <Field label="Цена в месяц">
                                    <input value={draft.pricePerMonth}
                                           onChange={(e) => setDraft({...draft, pricePerMonth: e.target.value})}/>
                                </Field>
                            ) : (
                                <Field label="Цена за сутки">
                                    <input value={draft.pricePerDay || ""}
                                           onChange={(e) => setDraft({...draft, pricePerDay: e.target.value})}/>
                                </Field>
                            )}
                            <Field label="Комнаты">
                                <input value={draft.rooms}
                                       onChange={(e) => setDraft({...draft, rooms: e.target.value})}/>
                            </Field>
                            {draft.rentalType === "short_term" && (
                                <Field label="Макс. гостей">
                                    <input value={draft.maxGuests || ""}
                                           onChange={(e) => setDraft({...draft, maxGuests: e.target.value})}/>
                                </Field>
                            )}
                            <Field label="Площадь">
                                <input value={draft.area} onChange={(e) => setDraft({...draft, area: e.target.value})}/>
                            </Field>
                            <Field label="Этаж">
                                <input value={draft.floor}
                                       onChange={(e) => setDraft({...draft, floor: e.target.value})}/>
                            </Field>
                            <Field label="Всего этажей">
                                <input value={draft.totalFloors}
                                       onChange={(e) => setDraft({...draft, totalFloors: e.target.value})}/>
                            </Field>
                            <Field label="Фотографии" wide>
                                <ImageUploader
                                    existingImages={draft.photos || []}
                                    onImagesUploaded={(urls) => setDraft({...draft, photos: urls})}
                                />
                            </Field>
                            <Field label="Описание" wide>
                                <textarea rows="8" value={draft.description}
                                          onChange={(e) => setDraft({...draft, description: e.target.value})}/>
                            </Field>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Metric({label, value}) {
    return (
        <article className="metric-card glass">
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    );
}

function Field({ label, children, wide = false }) {
    return (
        <label className={`field ${wide ? "field-wide" : ""}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

function Fact({ label, value }) {
    return (
        <div className="fact">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function Modal({ children, onClose, wide = false }) {
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className={`modal-card glass ${wide ? "wide" : ""}`} onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" onClick={onClose} title="Закрыть">
                    <Icon name="close" />
                </button>
                {children}
            </div>
        </div>
    );
}

function Icon({ name, isActive = false, onAnimationEnd }) {
    const [animating, setAnimating] = useState(false);

    const handleClick = () => {
        if (name === "heart") {
            setAnimating(true);
            setTimeout(() => {
                setAnimating(false);
                if (onAnimationEnd) onAnimationEnd();
            }, 300);
        }
    };

    if (name === "heart") {
        return (
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={`heart-icon ${isActive ? "liked" : ""} ${animating ? "animate" : ""}`}
                onClick={handleClick}
            >
                <path
                    d="M12 20.5 4.8 13.6a4.9 4.9 0 0 1 6.9-6.9L12 7l.3-.3a4.9 4.9 0 1 1 6.9 6.9L12 20.5Z"
                    fill={isActive ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    if (name === "logout") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M6 6 18 18M18 6 6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

function roleLabel(role) {
    switch ((role || "").toLowerCase()) {
        case "admin": return "Администратор";
        case "landlord": return "Арендодатель";
        default: return "Арендатор";
    }
}

function propertyLabel(type) {
    return propertyOptions.find((option) => option.value === type)?.label || "Жильё";
}

function statusLabel(status) {
    switch ((status || "").toLowerCase()) {
        case "approved": return "Одобрено";
        case "rejected": return "Отклонено";
        default: return "На модерации";
    }
}

function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU").format(value || 0) + " ₽";
}

function formatArea(value) {
    return value ? `${value} м²` : "Площадь не указана";
}

function fallbackImage(type) {
    const label = propertyLabel(type);
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f7f9" />
          <stop offset="100%" stop-color="#e8ebf0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="48" fill="url(#g)" />
      <g fill="#c4cad3">
        <rect x="320" y="290" width="560" height="320" rx="36" />
        <rect x="370" y="360" width="120" height="160" rx="20" fill="#eef1f5" />
        <rect x="550" y="360" width="220" height="90" rx="20" fill="#eef1f5" />
        <rect x="550" y="480" width="140" height="130" rx="20" fill="#eef1f5" />
      </g>
      <text x="600" y="720" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" fill="#6e6e73">
        ${label}
      </text>
    </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeInteger(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function normalizeNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number.parseFloat(String(value).replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
}

function dialogKey(dialog) {
    return `${dialog.adId}:${dialog.otherUserId}`;
}

function formatPriceWithType(price, rentalType) {
    const formatted = new Intl.NumberFormat("ru-RU").format(price || 0);
    if (rentalType === "short_term") return `${formatted} ₽ / сутки`;
    return `${formatted} ₽ / месяц`;
}

function ListingCard({ ad, onOpen, onToggleFavorite, isFavorite, loading }) {
    const [index, setIndex] = useState(0);

    const photos = ad.photos?.length
        ? ad.photos
        : [ad.primaryPhotoUrl || fallbackImage(ad.propertyType)];

    const next = () => setIndex((prev) => (prev + 1) % photos.length);
    const prev = () => setIndex((prev) => (prev - 1 + photos.length) % photos.length);

    return (
        <article className="listing-card glass">
            <div className="listing-media">
                <img className="listing-cover" src={photos[index]} alt={ad.title} onClick={() => onOpen(ad.id)} />
                {photos.length > 1 && (
                    <>
                        <button className="slider-arrow left" onClick={prev}>‹</button>
                        <button className="slider-arrow right" onClick={next}>›</button>
                        <div className="slider-dots">
                            {photos.map((_, i) => (
                                <span key={i} className={i === index ? "active" : ""} onClick={() => setIndex(i)} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="listing-content">
                <div className="listing-header">
                    <div>
                        <p className="listing-kicker">{propertyLabel(ad.propertyType)}</p>
                        <h3>{ad.title}</h3>
                    </div>
                    <button className={`icon-button ${isFavorite ? "active" : ""}`} onClick={async (e) => { e.stopPropagation(); await onToggleFavorite(ad.id); }} disabled={loading}>
                        <Icon name="heart" isActive={isFavorite} />
                    </button>
                </div>

                <p className="listing-price">
                    {formatPriceWithType(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth, ad.rentalType)}
                </p>

                <p className="listing-meta">
                    {ad.city}{ad.district ? `, ${ad.district}` : ""} • {ad.rooms || "?"} комн. • {formatArea(ad.area)}
                </p>

                <div className="pill-row">
                    <span className="pill">{statusLabel(ad.moderationStatus)}</span>
                    <span className="pill">{ad.active ? "Активно" : "Снято"}</span>
                    <span className="pill">{ad.rentalType === "short_term" ? "Посуточно" : "Долгосрочно"}</span>
                </div>
            </div>
        </article>
    );
}

function DetailsModal({ ad, onClose, onToggleFavorite, isFavorite, loading, onOpenDialog, hideActions = false }) {
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const photos = ad?.photoUrls?.length
        ? ad.photoUrls
        : [fallbackImage(ad?.propertyType || "apartment")];

    const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);

    const handleOpenDialog = () => {
        onOpenDialog(ad);
        onClose();
    };

    return (
        <Modal onClose={onClose}>
            <div className="details-layout">
                <div className="details-gallery">
                    <div className="details-slider-container">
                        <div className="photo-counter">{currentPhotoIndex + 1} / {photos.length}</div>
                        <img src={photos[currentPhotoIndex]} alt={ad?.title} className="details-main-image" />
                        {photos.length > 1 && (
                            <>
                                <button className="slider-arrow left" onClick={prevPhoto}>‹</button>
                                <button className="slider-arrow right" onClick={nextPhoto}>›</button>
                                <div className="slider-dots">
                                    {photos.map((_, idx) => (
                                        <span key={idx} className={idx === currentPhotoIndex ? "active" : ""} onClick={() => setCurrentPhotoIndex(idx)} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="details-content">
                    <span className="eyebrow">{propertyLabel(ad?.propertyType)}</span>
                    <h2>{ad?.title}</h2>
                    <p className="listing-price">
                        {formatPriceWithType(
                            ad?.rentalType === "short_term" ? ad?.pricePerDay : ad?.pricePerMonth,
                            ad?.rentalType
                        )}
                    </p>
                    <p className="details-description">{ad?.description || "Описание пока не заполнено."}</p>

                    <div className="details-facts">
                        <Fact label="Город" value={ad?.city} />
                        <Fact label="Адрес" value={ad?.address} />
                        <Fact label="Комнаты" value={String(ad?.rooms || "—")} />
                        <Fact label="Площадь" value={formatArea(ad?.area)} />
                        <Fact label="Этаж" value={ad?.floor ? `${ad?.floor}/${ad?.totalFloors || "?"}` : "—"} />
                        <Fact label="Просмотры" value={String(ad?.viewsCount || 0)} />
                        {ad?.rentalType === "short_term" && ad?.maxGuests && (
                            <Fact label="Макс. гостей" value={String(ad?.maxGuests)} />
                        )}
                    </div>

                    {!hideActions && (
                        <div className="details-actions">
                            <button className="primary-button" onClick={handleOpenDialog}>
                                Написать владельцу
                            </button>
                            <button className="secondary-button" onClick={() => onToggleFavorite(ad?.id)} disabled={loading}>
                                {isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function groupMessagesByDay(messages) {
    const groups = [];
    let currentDay = null;
    let currentDayLabel = null;
    let currentGroup = [];

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    messages.forEach((msg) => {
        const date = new Date(msg.createdAt);
        let dayLabel;

        if (date.toDateString() === today.toDateString()) {
            dayLabel = 'Сегодня';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dayLabel = 'Вчера';
        } else {
            dayLabel = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        }

        const dayKey = date.toDateString();

        if (currentDay !== dayKey) {
            if (currentGroup.length) {
                groups.push({ day: currentDayLabel, messages: [...currentGroup] });
            }
            currentDay = dayKey;
            currentDayLabel = dayLabel;
            currentGroup = [msg];
        } else {
            currentGroup.push(msg);
        }
    });

    if (currentGroup.length) {
        groups.push({ day: currentDayLabel, messages: [...currentGroup] });
    }

    return groups;
}

function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}
