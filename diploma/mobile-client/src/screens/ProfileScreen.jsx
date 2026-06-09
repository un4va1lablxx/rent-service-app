// ProfileScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    StyleSheet,
    Switch,
    ActivityIndicator,
    Alert,
    Linking,
    SafeAreaView,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    formatMoney,
    compactName,
    roleLabel,
    trustLevelMeta,
    verificationStatusMeta,
    formatDisplayDate,
} from "../shared/formatters";
import AddressInput from "../components/AddressInput.jsx";
import { VerificationBadge } from "../components/listings/ListingComponents.jsx";
import { assetUrl } from "../lib/api";

// ------------------------- Конфигурация категорий отзывов -------------------------
const REVIEW_CATEGORY_CONFIG = {
    tenant: [
        { key: "apartmentCondition", label: "Состояние квартиры" },
        { key: "cleanliness", label: "Чистота при заселении" },
        { key: "issueResolution", label: "Скорость решения вопросов" },
        { key: "friendliness", label: "Доброжелательность" },
    ],
    landlord: [
        { key: "timelyPayment", label: "Своевременность оплаты" },
        { key: "care", label: "Бережное отношение к имуществу" },
        { key: "rules", label: "Соблюдение правил дома" },
        { key: "communication", label: "Общение" },
    ],
};

// ------------------------- Вспомогательные функции -------------------------
function createInitialOwnerForm() {
    return {
        cadastralNumber: "",
        passportDocumentUrl: "",
        snilsDocumentUrl: "",
        egrnDocumentUrl: "",
        note: "",
    };
}

function createInitialTrustedForm() {
    return {
        preferredVideoSlot: "Будни 19:00–20:00",
        consentFsspCheck: false,
        note: "",
    };
}

function createInitialPassportDraft() {
    return {
        citizenship: "",
        passportNumber: "",
        passportIssuedBy: "",
        passportIssuedAt: "",
        registrationAddress: "",
    };
}

function createReviewDraft(role = "tenant") {
    const categories = REVIEW_CATEGORY_CONFIG[role].reduce((acc, item) => {
        acc[item.key] = 5;
        return acc;
    }, {});
    return { rating: 5, comment: "", categories };
}

function formatVerificationType(type) {
    return type === "trusted_partner" ? "Надежный партнер" : "Подтвержденный собственник";
}

function formatVerificationRequestStatus(status) {
    switch ((status || "").toLowerCase()) {
        case "approved":
            return "Одобрено";
        case "rejected":
            return "Отклонено";
        default:
            return "На проверке";
    }
}

function formatReviewRoleLabel(scope) {
    switch (scope) {
        case "landlord":
            return "Отзывы о вас как об арендодателе";
        case "tenant":
            return "Отзывы о вас как об арендаторе";
        case "written":
            return "Отзывы, которые оставили вы";
        default:
            return "Последние отзывы";
    }
}

function getInitials(name) {
    if (!name) return "?";
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function parseRequestData(serialized) {
    if (!serialized) return {};
    try {
        return JSON.parse(serialized);
    } catch {
        return {};
    }
}

function buildVerificationCardMeta(request, fallbackText) {
    const normalizedStatus = (request?.status || "").toLowerCase();
    if (normalizedStatus === "approved") {
        return {
            label: "Одобрено",
            tone: "approved",
            icon: "check-circle",
            caption: fallbackText,
        };
    }
    if (normalizedStatus === "rejected") {
        return {
            label: "Отклонено",
            tone: "rejected",
            icon: "error",
            caption: "Верификация не пройдена",
        };
    }
    if (normalizedStatus === "pending") {
        return {
            label: "На проверке",
            tone: "pending",
            icon: "hourglass-empty",
            caption: fallbackText,
        };
    }
    return {
        label: "Не отправлено",
        tone: "idle",
        icon: "arrow-forward",
        caption: fallbackText,
    };
}

// ------------------------- Компонент иконки статуса -------------------------
const StatusIcon = ({ type, size = 20, color = "#8E8E93" }) => {
    const glyphs = {
        tick: "✓",
        waiting: "…",
        alert: "!",
        arrow: "›",
    };
    return <Text style={{ color, fontSize: size, fontWeight: "700", lineHeight: size + 2 }}>{glyphs[type] || "?"}</Text>;
};

const Glyph = ({ children, size = 18, color = "#1C1C1E" }) => (
    <Text style={{ color, fontSize: size, fontWeight: "700", lineHeight: size + 2 }}>{children}</Text>
);

const OptionPicker = ({ value, options, onChange }) => (
    <View style={styles.optionPicker}>
        {options.map((option) => {
            const active = option.value === value;
            return (
                <TouchableOpacity
                    key={String(option.value)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => onChange(option.value)}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
            );
        })}
    </View>
);

function parseDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day) : new Date();
}

function verificationToneStyle(tone) {
    switch (tone) {
        case "approved":
            return { borderColor: "#34C759", backgroundColor: "#F0FFF5" };
        case "pending":
            return { borderColor: "#FFCC00", backgroundColor: "#FFF9E6" };
        case "rejected":
            return { borderColor: "#FF3B30", backgroundColor: "#FFF1F0" };
        default:
            return { borderColor: "#E5E5EA", backgroundColor: "#FFFFFF" };
    }
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function normalizePickedPhoto(asset, fallbackName = "photo.jpg") {
    const fallback = fallbackName.endsWith(".jpg") ? fallbackName : `${fallbackName}.jpg`;
    const rawName = asset.fileName || fallback;
    const name = /\.(png|jpe?g|webp|heic|heif)$/i.test(rawName) ? rawName : fallback;
    const isHeic = /\.(heic|heif)$/i.test(name) || /heic|heif/i.test(asset.mimeType || "");
    if (!isHeic) {
        return {
            ...asset,
            fileName: name,
            mimeType: asset.mimeType || (/\.(png)$/i.test(name) ? "image/png" : "image/jpeg")
        };
    }

    const converted = await ImageManipulator.manipulateAsync(asset.uri, [], {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
    });
    return {
        ...asset,
        uri: converted.uri,
        fileName: name.replace(/\.(heic|heif)$/i, ".jpg"),
        mimeType: "image/jpeg",
    };
}

// ------------------------- Компонент предпросмотра файла -------------------------
const FilePreview = ({ url, label, onClear }) => {
    const fileName = url ? decodeURIComponent(String(url).split("/").pop() || label) : "";
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);

    return (
        <View style={styles.fileCard}>
            <TouchableOpacity style={styles.filePreview} onPress={() => Linking.openURL(assetUrl(url))}>
                {isImage ? (
                    <Image source={{ uri: assetUrl(url) }} style={styles.fileImage} />
                ) : (
                    <View style={styles.fileFallback}>
                        <Text style={styles.fileFallbackText}>{label.slice(0, 2).toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.fileMeta}>
                    <Text style={styles.fileLabel}>{label}</Text>
                    <Text style={styles.fileName} numberOfLines={1}>
                        {fileName}
                    </Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fileRemove} onPress={onClear}>
                <Glyph color="#FF3B30">×</Glyph>
            </TouchableOpacity>
        </View>
    );
};

// ------------------------- Компонент поля загрузки файла -------------------------
const VerificationUploadField = ({ label, fieldKey, value, onUpload, onClear, loadingMap }) => {
    const handleFilePick = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Нет доступа", "Разрешите доступ к фото, чтобы выбрать документ.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.95,
        });

        if (!result.canceled && result.assets?.[0]) {
            await onUpload(fieldKey, await normalizePickedPhoto(result.assets[0], `${fieldKey}.jpg`));
        }
        return;
        // Здесь должна быть интеграция с react-native-document-picker или expo-image-picker
        // Для демонстрации используем заглушку
        Alert.alert("Выбор файла", "Функция загрузки файлов требует настройки нативного модуля.", [
            { text: "OK", style: "cancel" },
        ]);
    };
    return (
        <View style={styles.uploadField}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.uploadRow}>
                {value ? (
                    <FilePreview url={value} label={label} onClear={() => onClear(fieldKey)} />
                ) : (
                    <View style={styles.fileEmpty}>
                        <Text>Файл не загружен</Text>
                    </View>
                )}
                <TouchableOpacity style={styles.secondaryButton} onPress={handleFilePick}>
                    <Text style={styles.secondaryButtonText}>
                        {loadingMap[`upload-${fieldKey}`] ? "Загружаем..." : value ? "Заменить" : "Загрузить"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ------------------------- Компонент метрики рейтинга -------------------------
const RatingMetricCard = ({ label, rating, count }) => {
    const value = count ? Number(rating || 0).toFixed(2) : "0.00";
    return (
        <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{label}</Text>
            <View style={styles.ratingValue}>
                <Glyph size={16} color="#FFA000">★</Glyph>
                <Text style={styles.ratingNumber}>{value}</Text>
            </View>
            <Text style={styles.metricCount}>{count || 0} отзывов</Text>
        </View>
    );
};

// ------------------------- Компонент формы отзыва -------------------------
const ReviewForm = ({
                        booking,
                        role,
                        draft,
                        onChange,
                        onSubmit,
                        busy,
                        submitLabel = "Оставить отзыв",
                    }) => {
    const reviewerRole = role === "tenant" ? "tenant" : "landlord";
    const categories = REVIEW_CATEGORY_CONFIG[reviewerRole];
    const counterpartLabel = role === "tenant" ? "арендодателя" : "арендатора";

    return (
        <View style={styles.reviewForm}>
            <Text style={styles.reviewFormTitle}>
                Оценка сделки по объявлению “{booking.adTitle}”
            </Text>
            <Text style={styles.reviewFormSubtitle}>
                Оцените {counterpartLabel} и добавьте комментарий не короче 10 символов.
            </Text>

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Общая оценка</Text>
                <OptionPicker
                    value={draft.rating}
                    options={[5, 4, 3, 2, 1].map((v) => ({ label: `${v} из 5`, value: v }))}
                    onChange={(val) => onChange("rating", Number(val))}
                />
            </View>

            {categories.map((cat) => (
                <View key={cat.key} style={styles.field}>
                    <Text style={styles.fieldLabel}>{cat.label}</Text>
                    <OptionPicker
                        value={draft.categories[cat.key]}
                        options={[5, 4, 3, 2, 1].map((v) => ({ label: `${v}`, value: v }))}
                        onChange={(val) => onChange(`categories.${cat.key}`, Number(val))}
                    />
                </View>
            ))}

            <View style={styles.field}>
                <Text style={styles.fieldLabel}>Комментарий</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    value={draft.comment}
                    onChangeText={(text) => onChange("comment", text)}
                    placeholder="Напишите, как прошла сделка, что понравилось и что можно улучшить."
                />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={busy}>
                <Text style={styles.primaryButtonText}>
                    {busy ? "Сохраняем..." : submitLabel}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

// ------------------------- ОСНОВНОЙ КОМПОНЕНТ PROFILE SCREEN -------------------------
export const ProfileScreen = (props) => {
    const {
        profile,
        setProfile,
        loadingMap,
        setBusy,
        setError,
        setNotice,
        setSelectedTab,
        handleSavePayoutDetails,
        handleDeletePayoutDetails,
        handleLogout,
        handlePromoteToLandlord,
        verificationApi,
        reviewsApi,
        bookingsApi,
        uploadApi,
        authApi,
    } = props;

    const [ownerForm, setOwnerForm] = useState(createInitialOwnerForm);
    const [trustedForm, setTrustedForm] = useState(createInitialTrustedForm);
    const [verificationRequests, setVerificationRequests] = useState([]);
    const [reviewScope, setReviewScope] = useState("received");
    const [reviewsByScope, setReviewsByScope] = useState({
        received: [],
        landlord: [],
        tenant: [],
        written: [],
    });
    const [bookings, setBookings] = useState([]);
    const [openReviewBookingId, setOpenReviewBookingId] = useState(null);
    const [reviewDrafts, setReviewDrafts] = useState({});
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editReviewDrafts, setEditReviewDrafts] = useState({});
    const [expandedSettingsPanel, setExpandedSettingsPanel] = useState("credentials");
    const [activeVerificationForm, setActiveVerificationForm] = useState("owner_verified");
    const [dismissedReasonCards, setDismissedReasonCards] = useState({});
    const [reviewsPage, setReviewsPage] = useState(0);
    const [passportDraft, setPassportDraft] = useState(createInitialPassportDraft);
    const [passportDatePickerOpen, setPassportDatePickerOpen] = useState(false);
    const [payoutDraft, setPayoutDraft] = useState({
        payoutBankName: "",
        payoutAccountNumber: "",
    });

    const verificationMeta = verificationStatusMeta(profile.verificationStatus);
    const trustMeta = trustLevelMeta(profile.trustLevel, profile.reviewsCount);
    const profileRole = profile.role?.toLowerCase();
    const canShowLandlordReviews = profileRole === "landlord" || profileRole === "admin";

    const latestOwnerRequest = useMemo(
        () => verificationRequests.find((request) => request.verificationType === "owner_verified") || null,
        [verificationRequests]
    );
    const latestTrustedRequest = useMemo(
        () => verificationRequests.find((request) => request.verificationType === "trusted_partner") || null,
        [verificationRequests]
    );

    const pendingReviewBookings = useMemo(() => {
        const writtenBookingIds = new Set((reviewsByScope.written || []).map((review) => review.bookingId));
        return bookings.filter((booking) => booking.status === "completed" && !writtenBookingIds.has(booking.id));
    }, [bookings, reviewsByScope.written]);

    const currentReviews = reviewsByScope[reviewScope] || [];
    const pagedReviews = useMemo(
        () => currentReviews.slice(reviewsPage * 3, (reviewsPage + 1) * 3),
        [currentReviews, reviewsPage]
    );
    const reviewPagesCount = Math.max(1, Math.ceil(currentReviews.length / 3));
    const ownerRequestData = useMemo(() => parseRequestData(latestOwnerRequest?.requestData), [latestOwnerRequest?.requestData]);
    const trustedRequestData = useMemo(() => parseRequestData(latestTrustedRequest?.requestData), [latestTrustedRequest?.requestData]);
    const hasSavedPayoutDetails = Boolean(
        profile?.payoutBankName &&
        profile?.payoutAccountNumber
    );
    const hasSavedPassportDetails = Boolean(
        profile?.passportCitizenship &&
        profile?.passportNumber &&
        profile?.passportIssuedBy &&
        profile?.passportIssuedAt &&
        profile?.passportRegistrationAddress
    );
    const normalizedVerificationStatus = (profile?.verificationStatus || "").toLowerCase();
    const isOwnerApproved = normalizedVerificationStatus === "owner_verified" || normalizedVerificationStatus === "trusted_partner";
    const isTrustedApproved = normalizedVerificationStatus === "trusted_partner";
    const ownerRejectKey = `owner-${latestOwnerRequest?.id || "none"}`;
    const trustedRejectKey = `trusted-${latestTrustedRequest?.id || "none"}`;
    const showOwnerRejectedBanner = latestOwnerRequest?.status === "rejected" && latestOwnerRequest?.failureReason && !dismissedReasonCards[ownerRejectKey];
    const showTrustedRejectedBanner = latestTrustedRequest?.status === "rejected" && latestTrustedRequest?.failureReason && !dismissedReasonCards[trustedRejectKey];
    const visibleOwnerRequest = latestOwnerRequest?.status === "rejected" && dismissedReasonCards[ownerRejectKey] ? null : latestOwnerRequest;
    const visibleTrustedRequest = latestTrustedRequest?.status === "rejected" && dismissedReasonCards[trustedRejectKey] ? null : latestTrustedRequest;
    const effectiveOwnerRequest = !isOwnerApproved && visibleOwnerRequest?.status === "approved" ? null : visibleOwnerRequest;
    const effectiveTrustedRequest = !isTrustedApproved && visibleTrustedRequest?.status === "approved" ? null : visibleTrustedRequest;
    const ownerCardMeta = buildVerificationCardMeta(
        effectiveOwnerRequest,
        effectiveOwnerRequest?.cadastralNumber || "Нужны документы и кадастровый номер"
    );
    const trustedCardMeta = buildVerificationCardMeta(effectiveTrustedRequest, "Требуется минимум 3 завершенные аренды");

    useEffect(() => {
        let cancelled = false;

        async function loadProfileData() {
            try {
                const [verificationData, receivedReviews, landlordReviews, tenantReviews, writtenReviews, bookingsData] = await Promise.all([
                    verificationApi.mine(),
                    reviewsApi.listMine("received"),
                    reviewsApi.listMine("landlord"),
                    reviewsApi.listMine("tenant"),
                    reviewsApi.listMine("written"),
                    bookingsApi.list("all"),
                ]);

                if (cancelled) return;

                setVerificationRequests(Array.isArray(verificationData) ? verificationData : []);
                setReviewsByScope({
                    received: receivedReviews?.content || [],
                    landlord: landlordReviews?.content || [],
                    tenant: tenantReviews?.content || [],
                    written: writtenReviews?.content || [],
                });
                setBookings(bookingsData?.content || []);
            } catch (error) {
                if (!cancelled) setError(error.message);
            }
        }

        loadProfileData();
        return () => {
            cancelled = true;
        };
    }, [bookingsApi, reviewsApi, setError, verificationApi]);

    useEffect(() => {
        setOwnerForm((current) => ({
            ...current,
            cadastralNumber: ownerRequestData.cadastralNumber || "",
            passportDocumentUrl: ownerRequestData.passportDocumentUrl || "",
            snilsDocumentUrl: ownerRequestData.snilsDocumentUrl || "",
            egrnDocumentUrl: ownerRequestData.egrnDocumentUrl || "",
            note: ownerRequestData.note || "",
        }));
    }, [ownerRequestData]);

    useEffect(() => {
        setTrustedForm((current) => ({
            ...current,
            preferredVideoSlot: trustedRequestData.preferredVideoSlot || "Будни 19:00–20:00",
            consentFsspCheck: Boolean(trustedRequestData.consentFsspCheck),
            note: trustedRequestData.note || "",
        }));
    }, [trustedRequestData]);

    useEffect(() => {
        setPassportDraft({
            citizenship: profile?.passportCitizenship || "",
            passportNumber: profile?.passportNumber || "",
            passportIssuedBy: profile?.passportIssuedBy || "",
            passportIssuedAt: profile?.passportIssuedAt || "",
            registrationAddress: profile?.passportRegistrationAddress || "",
        });
    }, [
        profile?.passportCitizenship,
        profile?.passportNumber,
        profile?.passportIssuedBy,
        profile?.passportIssuedAt,
        profile?.passportRegistrationAddress,
    ]);

    useEffect(() => {
        setPayoutDraft({
            payoutBankName: profile?.payoutBankName || "",
            payoutAccountNumber: profile?.payoutAccountNumber || "",
        });
    }, [
        profile?.payoutBankName,
        profile?.payoutAccountNumber,
    ]);

    useEffect(() => {
        setReviewsPage(0);
    }, [reviewScope, currentReviews.length]);

    useEffect(() => {
        if (!canShowLandlordReviews && reviewScope === "landlord") {
            setReviewScope("received");
        }
    }, [canShowLandlordReviews, reviewScope]);

    function updateReviewDraft(bookingId, role, field, value) {
        setReviewDrafts((current) => {
            const next = { ...(current[bookingId] || createReviewDraft(role)) };
            if (field.startsWith("categories.")) {
                const categoryKey = field.split(".")[1];
                next.categories = { ...next.categories, [categoryKey]: value };
            } else {
                next[field] = value;
            }
            return { ...current, [bookingId]: next };
        });
    }

    function getReviewDraft(booking) {
        const reviewerRole = booking.tenantId === profile.id ? "tenant" : "landlord";
        return reviewDrafts[booking.id] || createReviewDraft(reviewerRole);
    }

    function createDraftFromReview(review) {
        const baseDraft = createReviewDraft(review.roleOfReviewer === "landlord" ? "landlord" : "tenant");
        return {
            rating: review.rating || baseDraft.rating,
            comment: review.comment || "",
            categories: {
                ...baseDraft.categories,
                ...(review.categories || {}),
            },
        };
    }

    function updateEditReviewDraft(reviewId, field, value) {
        setEditReviewDrafts((current) => {
            const next = { ...(current[reviewId] || {}) };
            if (field.startsWith("categories.")) {
                const categoryKey = field.split(".")[1];
                next.categories = { ...(next.categories || {}), [categoryKey]: value };
            } else {
                next[field] = value;
            }
            return { ...current, [reviewId]: next };
        });
    }

    function startEditReview(review) {
        setEditingReviewId(review.id);
        setEditReviewDrafts((current) => ({
            ...current,
            [review.id]: current[review.id] || createDraftFromReview(review),
        }));
    }

    async function reloadProfileCollections() {
        try {
            const [verificationData, receivedReviews, landlordReviews, tenantReviews, writtenReviews, bookingsData] = await Promise.all([
                verificationApi.mine(),
                reviewsApi.listMine("received"),
                reviewsApi.listMine("landlord"),
                reviewsApi.listMine("tenant"),
                reviewsApi.listMine("written"),
                bookingsApi.list("all"),
            ]);
            setVerificationRequests(Array.isArray(verificationData) ? verificationData : []);
            setReviewsByScope({
                received: receivedReviews?.content || [],
                landlord: landlordReviews?.content || [],
                tenant: tenantReviews?.content || [],
                written: writtenReviews?.content || [],
            });
            setBookings(bookingsData?.content || []);
        } catch (error) {
            setError(error.message);
        }
    }

    async function handleUpload(fieldKey, file) {
        try {
            setBusy(`upload-${fieldKey}`, true);
            const response = await uploadApi.uploadFile(file);
            setOwnerForm((current) => ({ ...current, [fieldKey]: response?.url || "" }));
            setNotice("Документ загружен.");
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(`upload-${fieldKey}`, false);
        }
    }

    async function handleClearUpload(fieldKey) {
        try {
            setBusy(`clear-${fieldKey}`, true);
            if (latestOwnerRequest?.id && ownerForm[fieldKey]) {
                await verificationApi.removeDocument(latestOwnerRequest.id, fieldKey);
            }
            setOwnerForm((current) => ({ ...current, [fieldKey]: "" }));
            setNotice("Документ удален.");
            await reloadProfileCollections();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(`clear-${fieldKey}`, false);
        }
    }

    async function handleAvatarUpload(file) {
        try {
            setBusy("upload-avatar", true);
            const response = await uploadApi.uploadFile(file);
            const avatarUrl = response?.url || "";
            const updatedProfile = authApi?.updateMyAvatar ? await authApi.updateMyAvatar(avatarUrl) : { ...profile, avatarUrl };
            setProfile(updatedProfile);
            setNotice("Фото профиля обновлено.");
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy("upload-avatar", false);
        }
    }

    async function submitOwnerVerification() {
        try {
            setBusy("owner-verification", true);
            await verificationApi.create({
                verificationType: "owner_verified",
                cadastralNumber: ownerForm.cadastralNumber,
                passportDocumentUrl: ownerForm.passportDocumentUrl,
                snilsDocumentUrl: ownerForm.snilsDocumentUrl,
                egrnDocumentUrl: ownerForm.egrnDocumentUrl,
                note: ownerForm.note,
            });
            setNotice("Заявка на верификацию собственника отправлена.");
            await reloadProfileCollections();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy("owner-verification", false);
        }
    }

    async function submitTrustedVerification() {
        try {
            setBusy("trusted-verification", true);
            await verificationApi.create({
                verificationType: "trusted_partner",
                preferredVideoSlot: trustedForm.preferredVideoSlot,
                consentFsspCheck: trustedForm.consentFsspCheck,
                note: trustedForm.note,
            });
            setNotice("Заявка на статус надежного партнера отправлена.");
            await reloadProfileCollections();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy("trusted-verification", false);
        }
    }

    async function submitReview(booking) {
        const reviewerRole = booking.tenantId === profile.id ? "tenant" : "landlord";
        const draft = getReviewDraft(booking);
        try {
            setBusy(`review-${booking.id}`, true);
            await reviewsApi.create({
                bookingId: booking.id,
                rating: draft.rating,
                comment: draft.comment,
                categories: draft.categories,
            });
            setNotice("Отзыв сохранен.");
            setOpenReviewBookingId(null);
            await reloadProfileCollections();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(`review-${booking.id}`, false);
        }
    }

    async function submitReviewUpdate(review) {
        const draft = editReviewDrafts[review.id] || createDraftFromReview(review);
        try {
            setBusy(`update-review-${review.id}`, true);
            await reviewsApi.update(review.id, {
                rating: draft.rating,
                comment: draft.comment,
                categories: draft.categories,
            });
            setNotice("Отзыв обновлен.");
            setEditingReviewId(null);
            await reloadProfileCollections();
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(`update-review-${review.id}`, false);
        }
    }

    async function deleteReview(review) {
        Alert.alert("Удалить отзыв?", "Это действие необратимо.", [
            { text: "Отмена", style: "cancel" },
            {
                text: "Удалить",
                style: "destructive",
                onPress: async () => {
                    try {
                        setBusy(`delete-review-${review.id}`, true);
                        await reviewsApi.remove(review.id);
                        setNotice("Отзыв удален.");
                        setEditingReviewId(null);
                        await reloadProfileCollections();
                    } catch (error) {
                        setError(error.message);
                    } finally {
                        setBusy(`delete-review-${review.id}`, false);
                    }
                },
            },
        ]);
    }

    async function handleSavePassportDetails() {
        try {
            setBusy("save-passport-details", true);
            const updatedProfile = await authApi.updateMyPassportDetails(passportDraft);
            setProfile(updatedProfile);
            setNotice("Паспортные данные сохранены.");
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy("save-passport-details", false);
        }
    }

    async function handleDeletePassportDetails() {
        try {
            setBusy("delete-passport-details", true);
            const updatedProfile = await authApi.deleteMyPassportDetails();
            setProfile(updatedProfile);
            setNotice("Паспортные данные удалены.");
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy("delete-passport-details", false);
        }
    }

    // --- Аватар ---
    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Нет доступа", "Разрешите доступ к фото, чтобы обновить аватар.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]) {
            await handleAvatarUpload(await normalizePickedPhoto(result.assets[0], "avatar.jpg"));
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
                <View style={styles.mainContent}>
                    {/* Шапка профиля */}
                    <View style={styles.profileHeader}>
                        <Text style={styles.eyebrow}>Профиль</Text>
                        <View style={styles.profileNameSection}>
                            <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
                                {profile.avatarUrl ? (
                                    <Image source={{ uri: assetUrl(profile.avatarUrl) }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>{profile.fullName?.charAt(0) || "П"}</Text>
                                    </View>
                                )}
                                <View style={styles.avatarEditBadge}>
                                    <Glyph size={14} color="#FFF">+</Glyph>
                                </View>
                            </TouchableOpacity>
                            <View style={styles.nameDetails}>
                                <View style={styles.nameRow}>
                                    {(() => {
                                        const words = (profile.fullName || "Пользователь").trim().split(/\s+/).filter(Boolean);
                                        const lastWord = words.pop() || "Пользователь";
                                        return (
                                            <>
                                                {words.map((word, index) => (
                                                    <Text key={`${word}-${index}`} style={styles.fullNameWord}>{word}</Text>
                                                ))}
                                                <View style={styles.lastNameWithBadge}>
                                                    <Text style={styles.fullNameWord}>{lastWord}</Text>
                                                    {isOwnerApproved && (
                                                        <View style={styles.profileVerificationBadge}>
                                                            <VerificationBadge status={normalizedVerificationStatus} />
                                                        </View>
                                                    )}
                                                </View>
                                            </>
                                        );
                                    })()}
                                </View>
                                <Text style={styles.phoneNumber}>{profile.phoneNumber}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Чипы статусов */}
                    <View style={styles.chipRow}>
                        {(profileRole === "landlord" || profileRole === "admin") && (
                            <View style={[styles.chip, { backgroundColor: "#E5F0FF" }]}>
                                <Text style={styles.chipText}>{verificationMeta.label}</Text>
                            </View>
                        )}
                        <View style={[styles.chip, { backgroundColor: "#E5E5EA" }]}>
                            <Text style={styles.chipText}>{trustMeta.label}</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: "#F2F2F7" }]}>
                            <Text style={styles.chipText}>{roleLabel(profile.role)}</Text>
                        </View>
                    </View>

                    {/* Метрики рейтинга */}
                    <View style={styles.metricsGrid}>
                        <RatingMetricCard label="Общий рейтинг" rating={profile.rating} count={profile.reviewsCount} />
                        {canShowLandlordReviews && (
                            <RatingMetricCard label="Как арендодатель" rating={profile.landlordRating} count={profile.landlordReviewsCount} />
                        )}
                        <RatingMetricCard label="Как арендатор" rating={profile.tenantRating} count={profile.tenantReviewsCount} />
                    </View>

                    {/* Блок отзывов */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Отзывы</Text>
                        <View style={styles.reviewSegmented}>
                            {["received", "landlord", "tenant", "written"].map((scope) => {
                                if (scope === "landlord" && !canShowLandlordReviews) return null;
                                return (
                                    <TouchableOpacity
                                        key={scope}
                                        style={[styles.reviewSegment, reviewScope === scope && styles.segmentActive]}
                                        onPress={() => setReviewScope(scope)}
                                    >
                                        <Text style={[styles.reviewSegmentText, reviewScope === scope && styles.segmentTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                                            {scope === "received"
                                                ? "Все"
                                                : scope === "landlord"
                                                    ? "Арендодатель"
                                                    : scope === "tenant"
                                                        ? "Арендатор"
                                                        : "Мои"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {currentReviews.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateTitle}>Пока пусто</Text>
                                <Text style={styles.emptyStateText}>
                                    Когда сделки будут завершаться и стороны начнут обмениваться отзывами, здесь появится история оценок.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {pagedReviews.map((review) => (
                                    <View key={review.id} style={styles.reviewCard}>
                                        {editingReviewId === review.id ? (
                                            <>
                                                <ReviewForm
                                                    booking={{ adTitle: review.adTitle }}
                                                    role={review.roleOfReviewer}
                                                    draft={editReviewDrafts[review.id] || createDraftFromReview(review)}
                                                    onChange={(field, value) => updateEditReviewDraft(review.id, field, value)}
                                                    onSubmit={() => submitReviewUpdate(review)}
                                                    busy={loadingMap[`update-review-${review.id}`]}
                                                    submitLabel="Сохранить изменения"
                                                />
                                                <View style={styles.reviewEditActions}>
                                                    <TouchableOpacity
                                                        style={styles.ghostButton}
                                                        onPress={() => setEditingReviewId(null)}
                                                    >
                                                        <Text style={styles.ghostButtonText}>Отмена</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.reviewCardTop}>
                                                    <View style={styles.reviewAuthorBlock}>
                                                        <View style={styles.reviewAuthorAvatar}>
                                                            {review.authorAvatarUrl ? (
                                                                <Image source={{ uri: assetUrl(review.authorAvatarUrl) }} style={styles.reviewAvatarImage} />
                                                            ) : (
                                                                <Text style={styles.reviewAvatarInitial}>{getInitials(review.authorName)}</Text>
                                                            )}
                                                        </View>
                                                        <Text style={styles.reviewAuthorName}>{compactName(review.authorName) || review.authorName}</Text>
                                                    </View>
                                                    <View style={styles.reviewRating}>
                                                        <Glyph size={16} color="#FFA000">★</Glyph>
                                                        <Text style={styles.reviewRatingValue}>{Number(review.rating || 0).toFixed(2)}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.reviewComment}>{review.comment}</Text>
                                                <Text style={styles.reviewAdTitle}>{review.adTitle}</Text>
                                                {reviewScope === "written" && (
                                                    <View style={styles.reviewCardActions}>
                                                        <TouchableOpacity
                                                            style={styles.secondaryButton}
                                                            onPress={() => startEditReview(review)}
                                                        >
                                                            <Text style={styles.secondaryButtonText}>Редактировать</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.ghostButton}
                                                            onPress={() => deleteReview(review)}
                                                            disabled={loadingMap[`delete-review-${review.id}`]}
                                                        >
                                                            <Text style={styles.ghostButtonText}>
                                                                {loadingMap[`delete-review-${review.id}`] ? "Удаляем..." : "Удалить"}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                ))}
                                {currentReviews.length > 3 && (
                                    <View style={styles.reviewPagination}>
                                        <TouchableOpacity
                                            style={styles.paginationButton}
                                            onPress={() => setReviewsPage((p) => Math.max(0, p - 1))}
                                            disabled={reviewsPage === 0}
                                        >
                                            <Text style={styles.paginationButtonText}>Назад</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.paginationInfo}>
                                            {reviewsPage + 1} из {reviewPagesCount}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.paginationButton}
                                            onPress={() => setReviewsPage((p) => Math.min(reviewPagesCount - 1, p + 1))}
                                            disabled={reviewsPage >= reviewPagesCount - 1}
                                        >
                                            <Text style={styles.paginationButtonText}>Вперед</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Завершенные сделки для оценки */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Завершенные сделки для оценки</Text>
                        <Text style={styles.sectionSubtitle}>
                            Оставить отзыв можно только по завершенной аренде и только один раз по каждой сделке.
                        </Text>
                        {pendingReviewBookings.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateTitle}>Нет сделок, ожидающих оценки</Text>
                                <Text style={styles.emptyStateText}>
                                    Когда аренда завершится и отзыв еще не будет оставлен, здесь появится форма взаимооценки.
                                </Text>
                            </View>
                        ) : (
                            pendingReviewBookings.map((booking, index) => {
                                const reviewerRole = booking.tenantId === profile.id ? "tenant" : "landlord";
                                const draft = getReviewDraft(booking);
                                return (
                                    <View
                                        key={booking.id}
                                        style={[
                                            styles.pendingReviewCard,
                                            index === pendingReviewBookings.length - 1 && styles.pendingReviewCardLast,
                                        ]}
                                    >
                                        <View style={styles.pendingReviewTop}>
                                            <View>
                                                <Text style={styles.pendingReviewTitle}>{booking.adTitle}</Text>
                                                <Text style={styles.pendingReviewPerson}>
                                                    {compactName(reviewerRole === "tenant" ? booking.landlordName : booking.tenantName) || (reviewerRole === "tenant" ? booking.landlordName : booking.tenantName)}
                                                </Text>
                                            </View>
                                            <Text style={styles.pendingReviewPrice}>{formatMoney(booking.agreedPrice)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={() =>
                                                setOpenReviewBookingId((current) => (current === booking.id ? null : booking.id))
                                            }
                                        >
                                            <Text style={styles.secondaryButtonText}>
                                                {openReviewBookingId === booking.id ? "Свернуть форму" : "Оценить сделку"}
                                            </Text>
                                        </TouchableOpacity>
                                        {openReviewBookingId === booking.id && (
                                            <ReviewForm
                                                booking={booking}
                                                role={reviewerRole}
                                                draft={draft}
                                                onChange={(field, value) =>
                                                    updateReviewDraft(booking.id, reviewerRole, field, value)
                                                }
                                                onSubmit={() => submitReview(booking)}
                                                busy={loadingMap[`review-${booking.id}`]}
                                            />
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                {/* Правая панель – настройки (под основной информацией) */}
                <View style={styles.sidePanel}>
                    <Text style={styles.sidePanelTitle}>Настройки профиля</Text>

                    {/* Паспортные данные */}
                    <View style={styles.settingsPanel}>
                        <TouchableOpacity
                            style={[styles.settingsToggle, expandedSettingsPanel === "passport" && styles.settingsToggleExpanded]}
                            onPress={() => setExpandedSettingsPanel((c) => (c === "passport" ? "" : "passport"))}
                        >
                            <Text style={styles.settingsToggleTitle}>Паспортные данные</Text>
                            <StatusIcon type="arrow" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                        {expandedSettingsPanel === "passport" && (
                            <View style={styles.settingsPanelBody}>
                                <View style={styles.formCard}>
                                    <View style={styles.formCardHeader}>
                                        <Text style={styles.formCardTitle}>Паспорт для договоров и верификации</Text>
                                        {hasSavedPassportDetails && (
                                            <TouchableOpacity
                                                style={styles.ghostButton}
                                                onPress={handleDeletePassportDetails}
                                                disabled={loadingMap["delete-passport-details"]}
                                            >
                                                <Text style={styles.ghostButtonText}>
                                                    {loadingMap["delete-passport-details"] ? "Удаляем..." : "Удалить"}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.credentialsGrid}>
                                        <View style={styles.field}>
                                            <Text style={styles.fieldLabel}>Гражданство</Text>
                                            <TextInput
                                                style={[styles.input, hasSavedPassportDetails && styles.mutedInput]}
                                                value={passportDraft.citizenship}
                                                onChangeText={(text) => setPassportDraft((d) => ({ ...d, citizenship: text }))}
                                                placeholder="Например, РФ"
                                                editable={!hasSavedPassportDetails}
                                            />
                                        </View>
                                        <View style={styles.field}>
                                            <Text style={styles.fieldLabel}>Серия и номер паспорта</Text>
                                            <TextInput
                                                style={[styles.input, hasSavedPassportDetails && styles.mutedInput]}
                                                value={passportDraft.passportNumber}
                                                onChangeText={(text) => setPassportDraft((d) => ({ ...d, passportNumber: text }))}
                                                placeholder="0000 000000"
                                                editable={!hasSavedPassportDetails}
                                            />
                                        </View>
                                        <View style={styles.fieldWide}>
                                            <Text style={styles.fieldLabel}>Кем выдан</Text>
                                            <TextInput
                                                style={[styles.input, hasSavedPassportDetails && styles.mutedInput]}
                                                value={passportDraft.passportIssuedBy}
                                                onChangeText={(text) => setPassportDraft((d) => ({ ...d, passportIssuedBy: text }))}
                                                placeholder="Название подразделения"
                                                editable={!hasSavedPassportDetails}
                                            />
                                        </View>
                                        <View style={styles.field}>
                                            <Text style={styles.fieldLabel}>Когда выдан</Text>
                                            <TouchableOpacity
                                                style={[styles.dateButton, hasSavedPassportDetails && styles.dateButtonDisabled]}
                                                onPress={() => !hasSavedPassportDetails && setPassportDatePickerOpen(true)}
                                                disabled={hasSavedPassportDetails}
                                            >
                                                <Text style={[styles.dateButtonText, !passportDraft.passportIssuedAt && styles.dateButtonPlaceholder]}>
                                                    {passportDraft.passportIssuedAt ? formatDisplayDate(passportDraft.passportIssuedAt) : "Выбрать дату"}
                                                </Text>
                                            </TouchableOpacity>
                                            {passportDatePickerOpen && (
                                                <DateTimePicker
                                                    value={parseDate(passportDraft.passportIssuedAt)}
                                                    mode="date"
                                                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                                                    onChange={(event, date) => {
                                                        setPassportDatePickerOpen(false);
                                                        if (event.type !== "dismissed" && date) {
                                                            setPassportDraft((d) => ({ ...d, passportIssuedAt: formatDate(date) }));
                                                        }
                                                    }}
                                                />
                                            )}
                                        </View>
                                        <View style={styles.fieldWide}>
                                            <Text style={styles.fieldLabel}>Адрес регистрации</Text>
                                            <AddressInput
                                                value={passportDraft.registrationAddress}
                                                onChange={(val) => setPassportDraft((d) => ({ ...d, registrationAddress: val }))}
                                                placeholder="Полный адрес регистрации"
                                                readOnly={hasSavedPassportDetails}
                                            />
                                        </View>
                                    </View>
                                    {!hasSavedPassportDetails && (
                                        <TouchableOpacity style={styles.primaryButton} onPress={handleSavePassportDetails} disabled={loadingMap["save-passport-details"]}>
                                            <Text style={styles.primaryButtonText}>
                                                {loadingMap["save-passport-details"] ? "Сохраняем..." : "Сохранить паспортные данные"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Реквизиты */}
                    <View style={styles.settingsPanel}>
                        <TouchableOpacity
                            style={[styles.settingsToggle, expandedSettingsPanel === "credentials" && styles.settingsToggleExpanded]}
                            onPress={() => setExpandedSettingsPanel((c) => (c === "credentials" ? "" : "credentials"))}
                        >
                            <Text style={styles.settingsToggleTitle}>Реквизиты</Text>
                            <StatusIcon type="arrow" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                        {expandedSettingsPanel === "credentials" && (
                            <View style={styles.settingsPanelBody}>
                                <View style={styles.formCard}>
                                    <View style={styles.formCardHeader}>
                                        <Text style={styles.formCardTitle}>Реквизиты для зачисления</Text>
                                        {hasSavedPayoutDetails && (
                                            <TouchableOpacity
                                                style={styles.ghostButton}
                                                onPress={handleDeletePayoutDetails}
                                                disabled={loadingMap["delete-payout-details"]}
                                            >
                                                <Text style={styles.ghostButtonText}>
                                                    {loadingMap["delete-payout-details"] ? "Удаляем..." : "Удалить"}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.credentialsGrid}>
                                        <View style={styles.fieldWide}>
                                            <Text style={styles.fieldLabel}>Банк</Text>
                                            <TextInput
                                                style={[styles.input, hasSavedPayoutDetails && styles.mutedInput]}
                                                value={payoutDraft.payoutBankName}
                                                onChangeText={(text) => setPayoutDraft((d) => ({ ...d, payoutBankName: text }))}
                                                placeholder="Например, СберБанк"
                                                editable={!hasSavedPayoutDetails}
                                            />
                                        </View>
                                        <View style={styles.fieldWide}>
                                            <Text style={styles.fieldLabel}>Номер карты</Text>
                                            <TextInput
                                                style={[styles.input, hasSavedPayoutDetails && styles.mutedInput]}
                                                value={payoutDraft.payoutAccountNumber}
                                                onChangeText={(text) => setPayoutDraft((d) => ({ ...d, payoutAccountNumber: text }))}
                                                placeholder="Введите номер карты"
                                                editable={!hasSavedPayoutDetails}
                                            />
                                        </View>
                                    </View>
                                    {!hasSavedPayoutDetails && (
                                        <TouchableOpacity
                                            style={styles.primaryButton}
                                            onPress={() => handleSavePayoutDetails(payoutDraft)}
                                            disabled={loadingMap["save-payout-details"]}
                                        >
                                            <Text style={styles.primaryButtonText}>
                                                {loadingMap["save-payout-details"] ? "Сохраняем..." : "Сохранить реквизиты"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Верификация */}
                    <View style={styles.settingsPanel}>
                        <TouchableOpacity
                            style={[styles.settingsToggle, expandedSettingsPanel === "verification" && styles.settingsToggleExpanded]}
                            onPress={() => setExpandedSettingsPanel((c) => (c === "verification" ? "" : "verification"))}
                        >
                            <Text style={styles.settingsToggleTitle}>Верификация</Text>
                            <StatusIcon type="arrow" size={20} color="#8E8E93" />
                        </TouchableOpacity>
                        {expandedSettingsPanel === "verification" && (
                            <View style={styles.settingsPanelBody}>
                                <View style={styles.verificationStatusGrid}>
                                    <TouchableOpacity
                                        style={[
                                            styles.verificationCard,
                                            isOwnerApproved ? styles.statusStatic : styles.clickable,
                                            verificationToneStyle(ownerCardMeta.tone),
                                            activeVerificationForm === "owner_verified" && styles.activeVerificationCard,
                                        ]}
                                        onPress={() => !isOwnerApproved && setActiveVerificationForm("owner_verified")}
                                        disabled={isOwnerApproved}
                                    >
                                        <View style={styles.verificationCardMain}>
                                            <Text style={styles.verificationCardLabel}>Подтвержденный собственник</Text>
                                            <Text style={styles.verificationCardStatus}>{ownerCardMeta.label}</Text>
                                        </View>
                                        <Text style={styles.verificationCardCaption}>{ownerCardMeta.caption}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.verificationCard,
                                            isTrustedApproved ? styles.statusStatic : styles.clickable,
                                            verificationToneStyle(trustedCardMeta.tone),
                                            activeVerificationForm === "trusted_partner" && styles.activeVerificationCard,
                                        ]}
                                        onPress={() => !isTrustedApproved && setActiveVerificationForm("trusted_partner")}
                                        disabled={isTrustedApproved}
                                    >
                                        <View style={styles.verificationCardMain}>
                                            <Text style={styles.verificationCardLabel}>Надежный партнер</Text>
                                            <Text style={styles.verificationCardStatus}>{trustedCardMeta.label}</Text>
                                        </View>
                                        <Text style={styles.verificationCardCaption}>{trustedCardMeta.caption}</Text>
                                    </TouchableOpacity>
                                </View>

                                {activeVerificationForm === "owner_verified" && !isOwnerApproved && (
                                    <View style={styles.verificationForm}>
                                        {showOwnerRejectedBanner && (
                                            <View style={styles.rejectBanner}>
                                                <Text style={styles.rejectBannerText}>{latestOwnerRequest.failureReason}</Text>
                                                <TouchableOpacity onPress={() => setDismissedReasonCards((d) => ({ ...d, [ownerRejectKey]: true }))}>
                                                    <Glyph size={20} color="#FFF">×</Glyph>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <View style={styles.formGrid}>
                                            <View style={styles.field}>
                                                <Text style={styles.fieldLabel}>Кадастровый номер</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    value={ownerForm.cadastralNumber}
                                                    onChangeText={(text) => setOwnerForm((f) => ({ ...f, cadastralNumber: text }))}
                                                    placeholder="00:00:0000000:000"
                                                />
                                            </View>
                                            <VerificationUploadField
                                                label="Паспорт"
                                                fieldKey="passportDocumentUrl"
                                                value={ownerForm.passportDocumentUrl}
                                                onUpload={handleUpload}
                                                onClear={handleClearUpload}
                                                loadingMap={loadingMap}
                                            />
                                            <VerificationUploadField
                                                label="СНИЛС"
                                                fieldKey="snilsDocumentUrl"
                                                value={ownerForm.snilsDocumentUrl}
                                                onUpload={handleUpload}
                                                onClear={handleClearUpload}
                                                loadingMap={loadingMap}
                                            />
                                            <VerificationUploadField
                                                label="Выписка ЕГРН"
                                                fieldKey="egrnDocumentUrl"
                                                value={ownerForm.egrnDocumentUrl}
                                                onUpload={handleUpload}
                                                onClear={handleClearUpload}
                                                loadingMap={loadingMap}
                                            />
                                            <View style={styles.fieldWide}>
                                                <Text style={styles.fieldLabel}>Комментарий</Text>
                                                <TextInput
                                                    style={styles.textArea}
                                                    multiline
                                                    numberOfLines={3}
                                                    value={ownerForm.note}
                                                    onChangeText={(text) => setOwnerForm((f) => ({ ...f, note: text }))}
                                                    placeholder="Например, объект оформлен на вас и готов к проверке."
                                                />
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.primaryButton} onPress={submitOwnerVerification} disabled={loadingMap["owner-verification"]}>
                                            <Text style={styles.primaryButtonText}>
                                                {loadingMap["owner-verification"] ? "Отправляем..." : "Отправить на проверку"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeVerificationForm === "trusted_partner" && !isTrustedApproved && (
                                    <View style={styles.verificationForm}>
                                        {showTrustedRejectedBanner && (
                                            <View style={styles.rejectBanner}>
                                                <Text style={styles.rejectBannerText}>{latestTrustedRequest.failureReason}</Text>
                                                <TouchableOpacity onPress={() => setDismissedReasonCards((d) => ({ ...d, [trustedRejectKey]: true }))}>
                                                    <Glyph size={20} color="#FFF">×</Glyph>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <View style={styles.formGrid}>
                                            <View style={styles.fieldWide}>
                                                <Text style={styles.fieldLabel}>Предпочтительный слот</Text>
                                                <OptionPicker
                                                    value={trustedForm.preferredVideoSlot}
                                                    options={[
                                                        "Будни 19:00–20:00",
                                                        "Будни 20:00–21:00",
                                                        "Суббота 12:00–13:00",
                                                        "Воскресенье 16:00–17:00",
                                                    ].map((slot) => ({ label: slot, value: slot }))}
                                                    onChange={(val) => setTrustedForm((f) => ({ ...f, preferredVideoSlot: val }))}
                                                />
                                            </View>
                                            <View style={styles.checkboxRow}>
                                                <Switch
                                                    value={trustedForm.consentFsspCheck}
                                                    onValueChange={(val) => setTrustedForm((f) => ({ ...f, consentFsspCheck: val }))}
                                                />
                                                <Text style={styles.checkboxLabel}>
                                                    Соглашаюсь на осуществление проверки сведений обо мне в Банке данных исполнительных производств Федеральной службы судебных приставов (ФССП России), а также в иных открытых официальных источниках информации.
                                                </Text>
                                            </View>
                                            <View style={styles.fieldWide}>
                                                <Text style={styles.fieldLabel}>Комментарий</Text>
                                                <TextInput
                                                    style={styles.textArea}
                                                    multiline
                                                    numberOfLines={3}
                                                    value={trustedForm.note}
                                                    onChangeText={(text) => setTrustedForm((f) => ({ ...f, note: text }))}
                                                    placeholder="Можно указать удобный Telegram для связи с модератором."
                                                />
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.primaryButton} onPress={submitTrustedVerification} disabled={loadingMap["trusted-verification"]}>
                                            <Text style={styles.primaryButtonText}>
                                                {loadingMap["trusted-verification"] ? "Отправляем..." : "Запросить статус"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// ------------------------- СТИЛИ -------------------------
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
    container: { flex: 1 },
    scrollContent: { paddingBottom: 176 },
    mainContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    profileHeader: { marginBottom: 18 },
    eyebrow: { fontSize: 13, color: "#8E8E93", marginBottom: 8 },
    profileNameSection: { flexDirection: "row", alignItems: "center" },
    avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E5E5EA", justifyContent: "center", alignItems: "center", marginRight: 16, position: "relative" },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#C6C6C8", justifyContent: "center", alignItems: "center" },
    avatarInitial: { fontSize: 28, color: "#FFF", fontWeight: "bold" },
    avatarEditBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#007AFF", borderRadius: 12, width: 24, height: 24, justifyContent: "center", alignItems: "center" },
    nameDetails: { flex: 1 },
    nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
    fullName: { flexShrink: 1, fontSize: 22, lineHeight: 27, fontWeight: "800", marginRight: 8, color: "#111113" },
    fullNameWord: { fontSize: 22, lineHeight: 27, fontWeight: "800", marginRight: 5, color: "#111113" },
    lastNameWithBadge: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
    profileVerificationBadge: { marginLeft: -1, marginTop: 2 },
    phoneNumber: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    chipText: { fontSize: 12, fontWeight: "500" },
    metricsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, gap: 12 },
    metricCard: { flex: 1, minHeight: 96, backgroundColor: "#FFF", borderRadius: 16, padding: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    metricLabel: { fontSize: 13, color: "#8E8E93", textAlign: "center" },
    ratingValue: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 4 },
    ratingNumber: { fontSize: 20, fontWeight: "700", marginLeft: 4 },
    metricCount: { fontSize: 11, color: "#C6C6C8", textAlign: "center" },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, color: "#8E8E93", marginBottom: 12 },
    segmented: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, backgroundColor: "#FFF", borderRadius: 14, overflow: "hidden" },
    segment: { flexGrow: 1, flexBasis: "45%", minHeight: 44, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
    segmentActive: { backgroundColor: "#007AFF" },
    segmentText: { fontSize: 14, color: "#1C1C1E" },
    segmentTextActive: { color: "#FFF", fontWeight: "500" },
    reviewSegmented: { flexDirection: "row", backgroundColor: "#F2F2F7", borderRadius: 10, padding: 2, marginBottom: 16 },
    reviewSegment: { flex: 1, minHeight: 38, paddingVertical: 8, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", borderRadius: 8 },
    reviewSegmentText: { fontSize: 12, color: "#1C1C1E", textAlign: "center" },
    emptyState: { alignItems: "center", paddingVertical: 40, backgroundColor: "#FFF", borderRadius: 16, marginBottom: 16, paddingHorizontal: 14 },
    emptyStateTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
    emptyStateText: { fontSize: 13, color: "#8E8E93", textAlign: "center", paddingHorizontal: 24 },
    reviewCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, marginBottom: 12 },
    reviewCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    reviewAuthorBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
    reviewAuthorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E5E5EA", justifyContent: "center", alignItems: "center" },
    reviewAvatarImage: { width: 32, height: 32, borderRadius: 16 },
    reviewAvatarInitial: { fontSize: 14, fontWeight: "bold", color: "#636366" },
    reviewAuthorName: { fontWeight: "500" },
    reviewRating: { flexDirection: "row", alignItems: "center", gap: 4 },
    reviewRatingValue: { fontWeight: "600", color: "#FFA000" },
    reviewComment: { fontSize: 14, marginBottom: 8 },
    reviewAdTitle: { fontSize: 12, color: "#8E8E93" },
    reviewCardActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 12 },
    reviewEditActions: { marginTop: 12, alignItems: "flex-end" },
    reviewPagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 16 },
    paginationButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#E5E5EA", borderRadius: 20 },
    paginationButtonText: { color: "#007AFF" },
    paginationInfo: { fontSize: 14 },
    divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 16 },
    pendingReviewCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, marginBottom: 12 },
    pendingReviewCardLast: { marginBottom: 0 },
    pendingReviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    pendingReviewTitle: { fontWeight: "600" },
    pendingReviewPerson: { fontSize: 13, color: "#8E8E93" },
    pendingReviewPrice: { fontWeight: "500", color: "#007AFF" },
    sidePanel: { backgroundColor: "#FFF", paddingHorizontal: 20, paddingVertical: 22, borderTopWidth: 1, borderTopColor: "#E5E5EA" },
    sidePanelTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
    settingsPanel: { marginBottom: 16 },
    settingsToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
    settingsToggleExpanded: { borderBottomWidth: 0 },
    settingsToggleTitle: { fontSize: 16, fontWeight: "500" },
    settingsPanelBody: { paddingTop: 12, paddingBottom: 8 },
    formCard: { backgroundColor: "#F7F7FA", borderRadius: 18, padding: 16 },
    formCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    formCardTitle: { fontSize: 15, fontWeight: "600" },
    credentialsGrid: { gap: 12 },
    credentialsMetaRow: { flexDirection: "row", gap: 12 },
    field: { marginBottom: 12, flex: 1 },
    fieldWide: { marginBottom: 12, width: "100%" },
    fieldLabel: { fontSize: 14, fontWeight: "500", marginBottom: 4, color: "#1C1C1E" },
    input: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5EA" },
    mutedInput: { backgroundColor: "#F2F2F7", color: "#8E8E93" },
    textArea: { backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5EA", textAlignVertical: "top", minHeight: 92 },
    dateButton: { minHeight: 46, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E5EA" },
    dateButtonDisabled: { backgroundColor: "#F2F2F7" },
    dateButtonText: { fontSize: 15, color: "#1C1C1E", fontWeight: "600" },
    dateButtonPlaceholder: { color: "#8E8E93", fontWeight: "500" },
    picker: { backgroundColor: "#FFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E5EA" },
    optionPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    optionChip: { minHeight: 38, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E5EA", justifyContent: "center", alignItems: "center" },
    optionChipActive: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
    optionChipText: { color: "#1C1C1E", fontSize: 13, fontWeight: "600" },
    optionChipTextActive: { color: "#FFFFFF" },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" },
    checkboxLabel: { fontSize: 13, color: "#1C1C1E", flex: 1 },
    primaryButton: { backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
    primaryButtonText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
    secondaryButton: { backgroundColor: "#E5E5EA", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
    secondaryButtonText: { color: "#007AFF", fontWeight: "500" },
    ghostButton: { paddingVertical: 8, paddingHorizontal: 12 },
    ghostButtonText: { color: "#8E8E93" },
    uploadField: { marginBottom: 12 },
    uploadRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    fileEmpty: { flex: 1, padding: 8, backgroundColor: "#F2F2F7", borderRadius: 8, alignItems: "center" },
    fileCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#F2F2F7", borderRadius: 8, padding: 8, flex: 1 },
    filePreview: { flexDirection: "row", alignItems: "center", flex: 1 },
    fileImage: { width: 40, height: 40, borderRadius: 4, marginRight: 8 },
    fileFallback: { width: 40, height: 40, borderRadius: 4, backgroundColor: "#C6C6C8", justifyContent: "center", alignItems: "center", marginRight: 8 },
    fileFallbackText: { color: "#FFF", fontWeight: "bold" },
    fileMeta: { flex: 1 },
    fileLabel: { fontSize: 12, fontWeight: "500" },
    fileName: { fontSize: 10, color: "#8E8E93" },
    fileRemove: { padding: 8 },
    reviewForm: { backgroundColor: "#F9F9FC", borderRadius: 16, padding: 12, marginTop: 12 },
    reviewFormTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
    reviewFormSubtitle: { fontSize: 13, color: "#8E8E93", marginBottom: 12 },
    verificationStatusGrid: { gap: 12, marginBottom: 16 },
    verificationCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E5EA", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
    clickable: { opacity: 1 },
    statusStatic: { opacity: 0.8 },
    activeVerificationCard: { borderColor: "#007AFF", backgroundColor: "#F0F8FF" },
    verificationCardMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    verificationCardLabel: { fontWeight: "500" },
    verificationCardStatus: { fontWeight: "600", color: "#1C1C1E" },
    verificationCardCaption: { fontSize: 12, color: "#8E8E93" },
    verificationCardIcon: { position: "absolute", right: 12, top: 12 },
    verificationForm: { marginTop: 8 },
    formGrid: { gap: 12, marginBottom: 16 },
    rejectBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FF3B30", borderRadius: 8, padding: 12, marginBottom: 12 },
    rejectBannerText: { color: "#FFF", flex: 1, fontSize: 13 },
});
