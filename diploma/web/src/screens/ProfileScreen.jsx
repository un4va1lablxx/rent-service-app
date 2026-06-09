import { useEffect, useMemo, useState } from "react";
import {
    formatMoney,
    roleLabel,
    trustLevelMeta,
    verificationStatusMeta
} from "../shared/formatters";
import AddressInput from "../components/AddressInput.jsx";
import { VerificationBadge } from "../components/listings/ListingComponents.jsx";
import { assetUrl } from "../lib/api";

const REVIEW_CATEGORY_CONFIG = {
    tenant: [
        { key: "apartmentCondition", label: "Состояние квартиры" },
        { key: "cleanliness", label: "Чистота при заселении" },
        { key: "issueResolution", label: "Скорость решения вопросов" },
        { key: "friendliness", label: "Доброжелательность" }
    ],
    landlord: [
        { key: "timelyPayment", label: "Своевременность оплаты" },
        { key: "care", label: "Бережное отношение к имуществу" },
        { key: "rules", label: "Соблюдение правил дома" },
        { key: "communication", label: "Общение" }
    ]
};

function createInitialOwnerForm() {
    return {
        cadastralNumber: "",
        passportDocumentUrl: "",
        snilsDocumentUrl: "",
        egrnDocumentUrl: "",
        note: ""
    };
}

function createInitialTrustedForm() {
    return {
        preferredVideoSlot: "Будни 19:00–20:00",
        consentFsspCheck: false,
        note: ""
    };
}

function createInitialPassportDraft() {
    return {
        citizenship: "",
        passportNumber: "",
        passportIssuedBy: "",
        passportIssuedAt: "",
        registrationAddress: ""
    };
}

function createReviewDraft(role = "tenant") {
    const categories = REVIEW_CATEGORY_CONFIG[role].reduce((accumulator, item) => {
        accumulator[item.key] = 5;
        return accumulator;
    }, {});

    return {
        rating: 5,
        comment: "",
        categories
    };
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
    if (!name) {
        return "?";
    }
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function parseRequestData(serialized) {
    if (!serialized) {
        return {};
    }
    try {
        return JSON.parse(serialized);
    } catch {
        return {};
    }
}

function buildVerificationCardMeta(request, fallbackText, isApproved = false) {
    if (isApproved) {
        return {
            label: "Одобрено",
            tone: "approved",
            icon: "tick",
            caption: fallbackText
        };
    }

    const normalizedStatus = (request?.status || "").toLowerCase();
    if (normalizedStatus === "approved") {
        return {
            label: "Одобрено",
            tone: "approved",
            icon: "tick",
            caption: fallbackText
        };
    }
    if (normalizedStatus === "rejected") {
        return {
            label: "Отклонено",
            tone: "rejected",
            icon: "alert",
            caption: "Верификация не пройдена"
        };
    }
    if (normalizedStatus === "pending") {
        return {
            label: "На проверке",
            tone: "pending",
            icon: "waiting",
            caption: fallbackText
        };
    }
    return {
        label: "Не отправлено",
        tone: "idle",
        icon: "arrow",
        caption: fallbackText
    };
}

function StatusIcon({ type }) {
    if (type === "tick") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="m8.5 12.2 2.4 2.4 4.8-5.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === "waiting") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7.2v5.2l3.1 1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === "alert") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7.6v5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16.7" r="1" fill="currentColor" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FilePreview({ url, label, onClear }) {
    const resolvedUrl = assetUrl(url);
    const fileName = url ? decodeURIComponent(String(url).split("/").pop() || label) : "";
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);

    return (
        <div className="verification-file-card">
            <a className="verification-file-preview" href={resolvedUrl} target="_blank" rel="noreferrer">
                {isImage ? (
                    <img src={resolvedUrl} alt={label} />
                ) : (
                    <div className="verification-file-fallback">{label.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="verification-file-meta">
                    <strong>{label}</strong>
                    <small>{fileName}</small>
                </div>
            </a>
            <button
                className="verification-file-remove"
                type="button"
                onClick={onClear}
                aria-label={`Удалить ${label}`}
            >
                X
            </button>
        </div>
    );
}

function VerificationUploadField({ label, fieldKey, value, onUpload, onClear, loadingMap }) {
    return (
        <div className="verification-upload-field">
            <span>{label}</span>
            <div className="verification-upload-row">
                {value ? (
                    <FilePreview url={value} label={label} onClear={() => onClear(fieldKey)} />
                ) : (
                    <div className="verification-file-empty">Файл не загружен</div>
                )}
                <label className="secondary-button verification-upload-button">
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                onUpload(fieldKey, file);
                            }
                            event.target.value = "";
                        }}
                        hidden
                    />
                    {loadingMap[`upload-${fieldKey}`] ? "Загружаем..." : value ? "Заменить" : "Загрузить"}
                </label>
            </div>
        </div>
    );
}

function RatingMetricCard({ label, rating, count }) {
    const value = count ? Number(rating || 0).toFixed(2) : "0.00";

    return (
        <div className="profile-metric-card rating-metric-card">
            <span>{label}</span>
            <div className="rating-metric-value">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m12 2 2.9 6.2 6.7.8-4.9 4.7 1.3 6.6-6-3.3-5.9 3.3 1.2-6.6L2.4 9l6.7-.8Z" />
                </svg>
                <strong>{value}</strong>
            </div>
            <small>{count || 0} отзывов</small>
        </div>
    );
}

function ReviewForm({ booking, role, draft, onChange, onSubmit, busy, submitLabel = "Оставить отзыв" }) {
    const reviewerRole = role === "tenant" ? "tenant" : "landlord";
    const categories = REVIEW_CATEGORY_CONFIG[reviewerRole];
    const counterpartLabel = role === "tenant" ? "арендодателя" : "арендатора";

    return (
        <div className="review-form-shell glass">
            <div className="section-heading tight">
                <div>
                    <h3>Оценка сделки по объявлению “{booking.adTitle}”</h3>
                    <p>Оцените {counterpartLabel} и добавьте комментарий не короче 10 символов.</p>
                </div>
            </div>

            <div className="contract-form-grid">
                <label className="field">
                    <span>Общая оценка</span>
                    <select
                        value={draft.rating}
                        onChange={(event) => onChange("rating", Number(event.target.value))}
                    >
                        {[5, 4, 3, 2, 1].map((value) => (
                            <option key={value} value={value}>{value} из 5</option>
                        ))}
                    </select>
                </label>

                {categories.map((category) => (
                    <label className="field" key={category.key}>
                        <span>{category.label}</span>
                        <select
                            value={draft.categories[category.key]}
                            onChange={(event) => onChange(`categories.${category.key}`, Number(event.target.value))}
                        >
                            {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>{value} из 5</option>
                            ))}
                        </select>
                    </label>
                ))}

                <label className="field field-wide">
                    <span>Комментарий</span>
                    <textarea
                        rows="4"
                        value={draft.comment}
                        onChange={(event) => onChange("comment", event.target.value)}
                        placeholder="Напишите, как прошла сделка, что понравилось и что можно улучшить."
                    />
                </label>
            </div>

            <div className="actions-row">
                <button className="primary-button" type="button" onClick={onSubmit} disabled={busy}>
                    {busy ? "Сохраняем..." : submitLabel}
                </button>
            </div>
        </div>
    );
}

export function ProfileScreen(props) {
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
        authApi
    } = props;

    const [ownerForm, setOwnerForm] = useState(createInitialOwnerForm);
    const [trustedForm, setTrustedForm] = useState(createInitialTrustedForm);
    const [verificationRequests, setVerificationRequests] = useState([]);
    const [reviewScope, setReviewScope] = useState("received");
    const [reviewsByScope, setReviewsByScope] = useState({
        received: [],
        landlord: [],
        tenant: [],
        written: []
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
    const [payoutDraft, setPayoutDraft] = useState({
        payoutBankName: "",
        payoutAccountNumber: ""
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
        profile?.payoutBankName
        && profile?.payoutAccountNumber
    );
    const hasSavedPassportDetails = Boolean(
        profile?.passportCitizenship
        && profile?.passportNumber
        && profile?.passportIssuedBy
        && profile?.passportIssuedAt
        && profile?.passportRegistrationAddress
    );
    const normalizedVerificationStatus = (profile?.verificationStatus || "").toLowerCase();
    const isOwnerApproved = normalizedVerificationStatus === "owner_verified" || normalizedVerificationStatus === "trusted_partner";
    const isTrustedApproved = normalizedVerificationStatus === "trusted_partner";
    const ownerRejectKey = `owner-${latestOwnerRequest?.id || "none"}`;
    const trustedRejectKey = `trusted-${latestTrustedRequest?.id || "none"}`;
    const showOwnerRejectedBanner = latestOwnerRequest?.status === "rejected" && latestOwnerRequest?.failureReason && !dismissedReasonCards[ownerRejectKey];
    const showTrustedRejectedBanner = latestTrustedRequest?.status === "rejected" && latestTrustedRequest?.failureReason && !dismissedReasonCards[trustedRejectKey];
    const visibleOwnerRequest = latestOwnerRequest?.status === "rejected" && dismissedReasonCards[ownerRejectKey]
        ? null
        : latestOwnerRequest;
    const visibleTrustedRequest = latestTrustedRequest?.status === "rejected" && dismissedReasonCards[trustedRejectKey]
        ? null
        : latestTrustedRequest;
    const effectiveOwnerRequest = !isOwnerApproved && visibleOwnerRequest?.status === "approved" ? null : visibleOwnerRequest;
    const effectiveTrustedRequest = !isTrustedApproved && visibleTrustedRequest?.status === "approved" ? null : visibleTrustedRequest;
    const ownerCardMeta = buildVerificationCardMeta(
        effectiveOwnerRequest,
        effectiveOwnerRequest?.cadastralNumber || "Статус собственника подтвержден",
        isOwnerApproved
    );
    const trustedCardMeta = buildVerificationCardMeta(
        effectiveTrustedRequest,
        isTrustedApproved ? "Статус надежного партнера подтвержден" : "Требуется минимум 3 завершенные аренды",
        isTrustedApproved
    );

    useEffect(() => {
        let cancelled = false;

        async function loadProfileData() {
            try {
                const [
                    verificationData,
                    receivedReviews,
                    landlordReviews,
                    tenantReviews,
                    writtenReviews,
                    bookingsData
                ] = await Promise.all([
                    verificationApi.mine(),
                    reviewsApi.listMine("received"),
                    reviewsApi.listMine("landlord"),
                    reviewsApi.listMine("tenant"),
                    reviewsApi.listMine("written"),
                    bookingsApi.list("all")
                ]);

                if (cancelled) {
                    return;
                }

                setVerificationRequests(Array.isArray(verificationData) ? verificationData : []);
                setReviewsByScope({
                    received: receivedReviews?.content || [],
                    landlord: landlordReviews?.content || [],
                    tenant: tenantReviews?.content || [],
                    written: writtenReviews?.content || []
                });
                setBookings(bookingsData?.content || []);
            } catch (error) {
                if (!cancelled) {
                    setError(error.message);
                }
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
            passportDocumentUrl: assetUrl(ownerRequestData.passportDocumentUrl),
            snilsDocumentUrl: assetUrl(ownerRequestData.snilsDocumentUrl),
            egrnDocumentUrl: assetUrl(ownerRequestData.egrnDocumentUrl),
            note: ownerRequestData.note || ""
        }));
    }, [ownerRequestData]);

    useEffect(() => {
        setTrustedForm((current) => ({
            ...current,
            preferredVideoSlot: trustedRequestData.preferredVideoSlot || "Будни 19:00–20:00",
            consentFsspCheck: Boolean(trustedRequestData.consentFsspCheck),
            note: trustedRequestData.note || ""
        }));
    }, [trustedRequestData]);

    useEffect(() => {
        if (!isOwnerApproved && latestOwnerRequest?.status !== "approved") {
            setActiveVerificationForm("owner_verified");
            return;
        }
        if (!isTrustedApproved && latestTrustedRequest?.status !== "approved") {
            setActiveVerificationForm("trusted_partner");
        }
    }, [isOwnerApproved, isTrustedApproved, latestOwnerRequest?.status, latestTrustedRequest?.status]);

    useEffect(() => {
        setPassportDraft({
            citizenship: profile?.passportCitizenship || "",
            passportNumber: profile?.passportNumber || "",
            passportIssuedBy: profile?.passportIssuedBy || "",
            passportIssuedAt: profile?.passportIssuedAt || "",
            registrationAddress: profile?.passportRegistrationAddress || ""
        });
    }, [
        profile?.passportCitizenship,
        profile?.passportNumber,
        profile?.passportIssuedBy,
        profile?.passportIssuedAt,
        profile?.passportRegistrationAddress
    ]);

    useEffect(() => {
        setPayoutDraft({
            payoutBankName: profile?.payoutBankName || "",
            payoutAccountNumber: profile?.payoutAccountNumber || ""
        });
    }, [
        profile?.payoutBankName,
        profile?.payoutAccountNumber
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
                ...(review.categories || {})
            }
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
            [review.id]: current[review.id] || createDraftFromReview(review)
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
                bookingsApi.list("all")
            ]);
            setVerificationRequests(Array.isArray(verificationData) ? verificationData : []);
            setReviewsByScope({
                received: receivedReviews?.content || [],
                landlord: landlordReviews?.content || [],
                tenant: tenantReviews?.content || [],
                written: writtenReviews?.content || []
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
            const updatedProfile = authApi?.updateMyAvatar
                ? await authApi.updateMyAvatar(avatarUrl)
                : { ...profile, avatarUrl };
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
                note: ownerForm.note
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
                note: trustedForm.note
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
                categories: draft.categories
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
                categories: draft.categories
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
        if (!window.confirm("Удалить этот отзыв?")) {
            return;
        }

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

    return (
        <div className="profile-layout">
            <div className="profile-main glass">
                <div className="profile-header">
                    <span className="eyebrow">Профиль</span>
                    <div className="profile-name-section">
                        <label className={`profile-avatar ${profile.avatarUrl ? "has-photo" : ""}`}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) {
                                        handleAvatarUpload(file);
                                    }
                                    event.target.value = "";
                                }}
                                hidden
                            />
                            {profile.avatarUrl ? (
                                <img src={assetUrl(profile.avatarUrl)} alt={profile.fullName || "Фото профиля"} />
                            ) : (
                                <span>{profile.fullName?.charAt(0) || "П"}</span>
                            )}
                            <small>{loadingMap["upload-avatar"] ? "..." : "+"}</small>
                        </label>
                        <div className="profile-name-details">
                            <div className="profile-name-row">
                                <h2>{profile.fullName}</h2>
                                {isOwnerApproved && <VerificationBadge status={normalizedVerificationStatus} />}
                            </div>
                            <p>{profile.phoneNumber}</p>
                        </div>
                    </div>
                </div>

                <div className="profile-chip-row">
                    {(profileRole === "landlord" || profileRole === "admin") && (
                        <span className={`profile-chip tone-${verificationMeta.tone}`}>{verificationMeta.label}</span>
                    )}
                    <span className={`profile-chip tone-${trustMeta.tone}`}>{trustMeta.label}</span>
                    <span className="profile-chip tone-muted">{roleLabel(profile.role)}</span>
                </div>

                <div className="profile-metrics-grid">
                    <RatingMetricCard label="Общий рейтинг" rating={profile.rating} count={profile.reviewsCount} />
                    {canShowLandlordReviews && (
                        <RatingMetricCard label="Как арендодатель" rating={profile.landlordRating} count={profile.landlordReviewsCount} />
                    )}
                    <RatingMetricCard label="Как арендатор" rating={profile.tenantRating} count={profile.tenantReviewsCount} />
                </div>

                <section className="profile-section">
                    <div className="section-heading tight reviews-section-heading">
                        <div>
                            <h1>Отзывы</h1>
                        </div>
                    </div>

                    <div className="segmented review-scope-switch">
                        <button className={reviewScope === "received" ? "active" : ""} type="button" onClick={() => setReviewScope("received")}>
                            Все отзывы
                        </button>
                        {canShowLandlordReviews && (
                            <button className={reviewScope === "landlord" ? "active" : ""} type="button" onClick={() => setReviewScope("landlord")}>
                                Как арендодатель
                            </button>
                        )}
                        <button className={reviewScope === "tenant" ? "active" : ""} type="button" onClick={() => setReviewScope("tenant")}>
                            Как арендатор
                        </button>
                        <button className={reviewScope === "written" ? "active" : ""} type="button" onClick={() => setReviewScope("written")}>
                            Оставленные мной
                        </button>
                    </div>

                    <div className="review-list">
                        {currentReviews.length ? pagedReviews.map((review) => (
                            <article key={review.id} className="review-card glass">
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
                                        <div className="actions-row review-edit-actions">
                                            <button
                                                className="ghost-button"
                                                type="button"
                                                onClick={() => setEditingReviewId(null)}
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="review-card-top">
                                            <div className="review-author-block">
                                                <div className="review-author-avatar">
                                                    {review.authorAvatarUrl ? (
                                                        <img src={review.authorAvatarUrl} alt={review.authorName} />
                                                    ) : (
                                                        <span>{getInitials(review.authorName)}</span>
                                                    )}
                                                </div>
                                                <strong>{review.authorName}</strong>
                                            </div>
                                            <span className="review-rating">
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="m12 2 2.9 6.2 6.7.8-4.9 4.7 1.3 6.6-6-3.3-5.9 3.3 1.2-6.6L2.4 9l6.7-.8Z" />
                                                </svg>
                                                {Number(review.rating || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <p>{review.comment}</p>
                                        <small>{review.adTitle}</small>
                                        {reviewScope === "written" && (
                                            <div className="actions-row review-card-actions">
                                                <button
                                                    className="secondary-button"
                                                    type="button"
                                                    onClick={() => startEditReview(review)}
                                                >
                                                    Редактировать
                                                </button>
                                                <button
                                                    className="ghost-button"
                                                    type="button"
                                                    onClick={() => deleteReview(review)}
                                                    disabled={loadingMap[`delete-review-${review.id}`]}
                                                >
                                                    {loadingMap[`delete-review-${review.id}`] ? "Удаляем..." : "Удалить"}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </article>
                        )) : (
                            <div className="empty-state glass profile-empty-panel">
                                <h3>Пока пусто</h3>
                                <p>Когда сделки будут завершаться и стороны начнут обмениваться отзывами, здесь появится история оценок.</p>
                            </div>
                        )}
                        {currentReviews.length > 3 && (
                            <div className="review-pagination">
                                <button
                                    className="secondary-button compact-pagination-button"
                                    type="button"
                                    onClick={() => setReviewsPage((current) => Math.max(0, current - 1))}
                                    disabled={reviewsPage === 0}
                                >
                                    Назад
                                </button>
                                <span>{reviewsPage + 1} из {reviewPagesCount}</span>
                                <button
                                    className="secondary-button compact-pagination-button"
                                    type="button"
                                    onClick={() => setReviewsPage((current) => Math.min(reviewPagesCount - 1, current + 1))}
                                    disabled={reviewsPage >= reviewPagesCount - 1}
                                >
                                    Вперед
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <div className="profile-divider" />

                <section className="profile-section">
                    <div className="section-heading tight">
                        <div>
                            <h3>Завершенные сделки для оценки</h3>
                            <p>Оставить отзыв можно только по завершенной аренде и только один раз по каждой сделке.</p>
                        </div>
                    </div>

                    <div className="pending-review-list">
                        {pendingReviewBookings.length ? pendingReviewBookings.map((booking) => {
                            const reviewerRole = booking.tenantId === profile.id ? "tenant" : "landlord";
                            const draft = getReviewDraft(booking);
                            return (
                                <article key={booking.id} className="pending-review-card glass">
                                    <div className="pending-review-top">
                                        <div>
                                            <strong>{booking.adTitle}</strong>
                                            <span>{reviewerRole === "tenant" ? booking.landlordName : booking.tenantName}</span>
                                        </div>
                                        <div className="pending-review-meta">
                                            <span>{formatMoney(booking.agreedPrice)}</span>
                                        </div>
                                    </div>
                                    <div className="actions-row">
                                        <button
                                            className="secondary-button"
                                            type="button"
                                            onClick={() => setOpenReviewBookingId((current) => current === booking.id ? null : booking.id)}
                                        >
                                            {openReviewBookingId === booking.id ? "Свернуть форму" : "Оценить сделку"}
                                        </button>
                                    </div>
                                    {openReviewBookingId === booking.id && (
                                        <ReviewForm
                                            booking={booking}
                                            role={reviewerRole}
                                            draft={draft}
                                            onChange={(field, value) => updateReviewDraft(booking.id, reviewerRole, field, value)}
                                            onSubmit={() => submitReview(booking)}
                                            busy={loadingMap[`review-${booking.id}`]}
                                        />
                                    )}
                                </article>
                            );
                        }) : (
                            <div className="empty-state glass profile-empty-panel">
                                <h3>Нет сделок, ожидающих оценки</h3>
                                <p>Когда аренда завершится и отзыв еще не будет оставлен, здесь появится форма взаимооценки.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <aside className="profile-side-panel">
                <div className="profile-settings-shell glass">
                    <div className="profile-settings-heading">
                        <h1>Настройки профиля</h1>
                    </div>

                    <section className="settings-panel">
                        <button
                            className={`settings-panel-toggle ${expandedSettingsPanel === "passport" ? "expanded" : ""}`}
                            type="button"
                            onClick={() => setExpandedSettingsPanel((current) => current === "passport" ? "" : "passport")}
                        >
                            <h2>Паспортные данные</h2>
                            <StatusIcon type="arrow" />
                        </button>

                        {expandedSettingsPanel === "passport" && (
                            <div className="settings-panel-body">
                                <div className="verification-form-card credentials-form-card glass">
                                    <div className="form-card-header">
                                        <div className="section-heading tight">
                                            <div>
                                                <h3>Паспорт для договоров и верификации</h3>
                                            </div>
                                        </div>
                                        {hasSavedPassportDetails && (
                                            <button
                                                className="ghost-button compact-ghost-button"
                                                type="button"
                                                onClick={handleDeletePassportDetails}
                                                disabled={loadingMap["delete-passport-details"]}
                                            >
                                                {loadingMap["delete-passport-details"] ? "Удаляем..." : "Удалить"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="credentials-grid">
                                        <label className="field">
                                            <span>Гражданство</span>
                                            <input
                                                value={passportDraft.citizenship}
                                                onChange={(event) => setPassportDraft((current) => ({ ...current, citizenship: event.target.value }))}
                                                placeholder="Например, РФ"
                                                readOnly={hasSavedPassportDetails}
                                            />
                                        </label>
                                        <label className="field">
                                            <span>Серия и номер паспорта</span>
                                            <input
                                                value={passportDraft.passportNumber}
                                                onChange={(event) => setPassportDraft((current) => ({ ...current, passportNumber: event.target.value }))}
                                                placeholder="0000 000000"
                                                readOnly={hasSavedPassportDetails}
                                            />
                                        </label>
                                        <label className="field field-wide">
                                            <span>Кем выдан</span>
                                            <input
                                                value={passportDraft.passportIssuedBy}
                                                onChange={(event) => setPassportDraft((current) => ({ ...current, passportIssuedBy: event.target.value }))}
                                                placeholder="Название подразделения"
                                                readOnly={hasSavedPassportDetails}
                                            />
                                        </label>
                                        <div className="credentials-meta-row">
                                            <label className="field">
                                                <span>Когда выдан</span>
                                                <input
                                                    type="date"
                                                    value={passportDraft.passportIssuedAt}
                                                    onChange={(event) => setPassportDraft((current) => ({ ...current, passportIssuedAt: event.target.value }))}
                                                    readOnly={hasSavedPassportDetails}
                                                />
                                            </label>
                                        </div>
                                        <label className="field field-wide">
                                            <span>Адрес регистрации</span>
                                            <AddressInput
                                                value={passportDraft.registrationAddress}
                                                onChange={(value) => setPassportDraft((current) => ({ ...current, registrationAddress: value }))}
                                                placeholder="Полный адрес регистрации"
                                                readOnly={hasSavedPassportDetails}
                                            />
                                        </label>
                                    </div>

                                    {!hasSavedPassportDetails && (
                                        <div className="actions-row form-submit-row">
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={handleSavePassportDetails}
                                                disabled={loadingMap["save-passport-details"]}
                                            >
                                                {loadingMap["save-passport-details"] ? "Сохраняем..." : "Сохранить паспортные данные"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="settings-panel">
                        <button
                            className={`settings-panel-toggle ${expandedSettingsPanel === "credentials" ? "expanded" : ""}`}
                            type="button"
                            onClick={() => setExpandedSettingsPanel((current) => current === "credentials" ? "" : "credentials")}
                        >
                            <h2>Реквизиты</h2>
                            <StatusIcon type="arrow" />
                        </button>

                        {expandedSettingsPanel === "credentials" && (
                            <div className="settings-panel-body">
                                <div className="verification-form-card credentials-form-card glass">
                                    <div className="form-card-header">
                                        <div className="section-heading tight">
                                            <div>
                                                <h3>Реквизиты для зачисления</h3>
                                            </div>
                                        </div>
                                        {hasSavedPayoutDetails && (
                                            <button
                                                className="ghost-button compact-ghost-button"
                                                type="button"
                                                onClick={handleDeletePayoutDetails}
                                                disabled={loadingMap["delete-payout-details"]}
                                            >
                                                {loadingMap["delete-payout-details"] ? "Удаляем..." : "Удалить"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="credentials-grid">
                                        <label className="field field-wide">
                                            <span>Банк</span>
                                            <input
                                                value={payoutDraft.payoutBankName}
                                                onChange={(event) => setPayoutDraft((current) => ({
                                                    ...current,
                                                    payoutBankName: event.target.value
                                                }))}
                                                placeholder="Например, СберБанк"
                                                readOnly={hasSavedPayoutDetails}
                                            />
                                        </label>
                                        <label className="field field-wide">
                                            <span>Номер карты</span>
                                            <input
                                                value={payoutDraft.payoutAccountNumber}
                                                onChange={(event) => setPayoutDraft((current) => ({
                                                    ...current,
                                                    payoutAccountNumber: event.target.value
                                                }))}
                                                placeholder="Введите номер карты"
                                                readOnly={hasSavedPayoutDetails}
                                            />
                                        </label>
                                    </div>

                                    {!hasSavedPayoutDetails && (
                                        <div className="actions-row form-submit-row">
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={() => handleSavePayoutDetails(payoutDraft)}
                                                disabled={loadingMap["save-payout-details"]}
                                            >
                                                {loadingMap["save-payout-details"] ? "Сохраняем..." : "Сохранить реквизиты"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="settings-panel">
                        <button
                            className={`settings-panel-toggle ${expandedSettingsPanel === "verification" ? "expanded" : ""}`}
                            type="button"
                            onClick={() => setExpandedSettingsPanel((current) => current === "verification" ? "" : "verification")}
                        >
                            <h2>Верификация</h2>
                            <StatusIcon type="arrow" />
                        </button>

                        {expandedSettingsPanel === "verification" && (
                            <div className="settings-panel-body">
                                <div className="verification-status-grid compact-status-grid">
                                    <button
                                        className={`verification-status-card glass ${isOwnerApproved ? "status-static" : "clickable"} status-${ownerCardMeta.tone} ${activeVerificationForm === "owner_verified" ? "active" : ""}`}
                                        type="button"
                                        onClick={() => !isOwnerApproved && setActiveVerificationForm("owner_verified")}
                                    >
                                        <div className="verification-status-mainline">
                                            <span>Подтвержденный собственник</span>
                                            <strong>{ownerCardMeta.label}</strong>
                                        </div>
                                        <small>{ownerCardMeta.caption}</small>
                                        <div className="verification-status-icon">
                                            <StatusIcon type={ownerCardMeta.icon} />
                                        </div>
                                    </button>
                                    <button
                                        className={`verification-status-card glass ${isTrustedApproved ? "status-static" : "clickable"} status-${trustedCardMeta.tone} ${activeVerificationForm === "trusted_partner" ? "active" : ""}`}
                                        type="button"
                                        onClick={() => !isTrustedApproved && setActiveVerificationForm("trusted_partner")}
                                    >
                                        <div className="verification-status-mainline">
                                            <span>Надежный партнер</span>
                                            <strong>{trustedCardMeta.label}</strong>
                                        </div>
                                        <small>{trustedCardMeta.caption}</small>
                                        <div className="verification-status-icon">
                                            <StatusIcon type={trustedCardMeta.icon} />
                                        </div>
                                    </button>
                                </div>

                                <div className="verification-forms-grid single-form-grid">
                                    {activeVerificationForm === "owner_verified" && !isOwnerApproved && (
                                        <div className="verification-form-card compact-verification-form glass">
                                            <div className="section-heading tight form-section-heading">
                                                <div>
                                                    <h3>Подтверждение статуса собственника</h3>
                                                </div>
                                            </div>
                                            {showOwnerRejectedBanner && (
                                                <div className="verification-reject-banner" role="alert">
                                                    <span>{latestOwnerRequest.failureReason}</span>
                                                    <button
                                                        type="button"
                                                        className="verification-reject-close"
                                                        onClick={() => setDismissedReasonCards((current) => ({ ...current, [ownerRejectKey]: true }))}
                                                        aria-label="Закрыть сообщение"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                            <div className="contract-form-grid compact-form-grid">
                                                <label className="field">
                                                    <span>Кадастровый номер</span>
                                                    <input
                                                        value={ownerForm.cadastralNumber}
                                                        onChange={(event) => setOwnerForm((current) => ({ ...current, cadastralNumber: event.target.value }))}
                                                        placeholder="00:00:0000000:000"
                                                    />
                                                </label>
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
                                                <label className="field field-wide">
                                                    <span>Комментарий</span>
                                                    <textarea
                                                        rows="3"
                                                        value={ownerForm.note}
                                                        onChange={(event) => setOwnerForm((current) => ({ ...current, note: event.target.value }))}
                                                        placeholder="Например, объект оформлен на вас и готов к проверке."
                                                    />
                                                </label>
                                            </div>
                                            <div className="actions-row form-submit-row">
                                                <button
                                                    className="primary-button"
                                                    type="button"
                                                    onClick={submitOwnerVerification}
                                                    disabled={loadingMap["owner-verification"]}
                                                >
                                                    {loadingMap["owner-verification"] ? "Отправляем..." : "Отправить на проверку"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeVerificationForm === "trusted_partner" && !isTrustedApproved && (
                                        <div className="verification-form-card compact-verification-form glass">
                                            <div className="section-heading tight form-section-heading">
                                                <div>
                                                    <h3>Получение статуса "Надежный партнер"</h3>
                                                </div>
                                            </div>
                                            {showTrustedRejectedBanner && (
                                                <div className="verification-reject-banner" role="alert">
                                                    <span>{latestTrustedRequest.failureReason}</span>
                                                    <button
                                                        type="button"
                                                        className="verification-reject-close"
                                                        onClick={() => setDismissedReasonCards((current) => ({ ...current, [trustedRejectKey]: true }))}
                                                        aria-label="Закрыть сообщение"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                            <div className="contract-form-grid compact-form-grid">
                                                <label className="field field-wide">
                                                    <span>Предпочтительный слот</span>
                                                    <select
                                                        value={trustedForm.preferredVideoSlot}
                                                        onChange={(event) => setTrustedForm((current) => ({ ...current, preferredVideoSlot: event.target.value }))}
                                                    >
                                                        <option value="Будни 19:00–20:00">Будни 19:00–20:00</option>
                                                        <option value="Будни 20:00–21:00">Будни 20:00–21:00</option>
                                                        <option value="Суббота 12:00–13:00">Суббота 12:00–13:00</option>
                                                        <option value="Воскресенье 16:00–17:00">Воскресенье 16:00–17:00</option>
                                                    </select>
                                                </label>
                                                <label className="checkbox-row field-wide long-checkbox-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={trustedForm.consentFsspCheck}
                                                        onChange={(event) => setTrustedForm((current) => ({
                                                            ...current,
                                                            consentFsspCheck: event.target.checked
                                                        }))}
                                                    />
                                                    <span>«Соглашаюсь на осуществление проверки сведений обо мне в Банке данных исполнительных производств Федеральной службы судебных приставов (ФССП России), а также в иных открытых официальных источниках информации».</span>
                                                </label>
                                                <label className="field field-wide">
                                                    <span>Комментарий</span>
                                                    <textarea
                                                        rows="3"
                                                        value={trustedForm.note}
                                                        onChange={(event) => setTrustedForm((current) => ({ ...current, note: event.target.value }))}
                                                        placeholder="Можно указать удобный Telegram для связи с модератором."
                                                    />
                                                </label>
                                            </div>
                                            <div className="actions-row form-submit-row">
                                                <button
                                                    className="primary-button"
                                                    type="button"
                                                    onClick={submitTrustedVerification}
                                                    disabled={loadingMap["trusted-verification"]}
                                                >
                                                    {loadingMap["trusted-verification"] ? "Отправляем..." : "Запросить статус"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </aside>
        </div>
    );
}


