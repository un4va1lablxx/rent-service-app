// AdminScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    FlatList,
    Image,
    StyleSheet,
    Modal as RNModal,
    Alert,
    Linking,
    ActivityIndicator,
    SafeAreaView,
} from "react-native";
import { compactName, roleLabel } from "../shared/formatters";
import {assetUrl, getFullUrl} from "../lib/api";

// ----------------------------------------------------------------------
// Вспомогательные функции (без изменений, кроме замены window.location.origin)
// ----------------------------------------------------------------------
function formatVerificationType(type) {
    return type === "trusted_partner" ? "Надежный партнер" : "Собственник";
}

function formatVerificationStatus(status) {
    switch ((status || "").toLowerCase()) {
        case "approved":
            return "Одобрено";
        case "rejected":
            return "Отклонено";
        default:
            return "На модерации";
    }
}

function formatUserVerificationStatus(status, verified) {
    switch ((status || (verified ? "owner_verified" : "basic_verified")).toLowerCase()) {
        case "trusted_partner":
            return "Надежный партнер";
        case "owner_verified":
            return "Собственник";
        default:
            return "Базовая";
    }
}

function parseRequestData(request) {
    if (!request?.requestData) return {};
    if (typeof request.requestData === "object") return request.requestData;
    try {
        return JSON.parse(request.requestData);
    } catch {
        return {};
    }
}

function getRequestDocuments(request) {
    const data = parseRequestData(request);
    return [
        { key: "passportDocumentUrl", label: "Паспорт", url: data.passportDocumentUrl },
        { key: "snilsDocumentUrl", label: "СНИЛС", url: data.snilsDocumentUrl },
        { key: "egrnDocumentUrl", label: "Выписка ЕГРН", url: data.egrnDocumentUrl },
    ].filter((doc) => Boolean(doc.url));
}

function getDocumentFileName(url, fallbackLabel) {
    if (!url) return fallbackLabel;
    try {
        // В React Native нет URL с window.location.origin, используем просто разбивку
        const rawName = url.split("/").pop() || fallbackLabel;
        return decodeURIComponent(rawName);
    } catch {
        const rawName = String(url).split("/").pop() || fallbackLabel;
        return decodeURIComponent(rawName);
    }
}

// ----------------------------------------------------------------------
// Компонент предпросмотра документа
// ----------------------------------------------------------------------
const VerificationDocumentPreview = ({ document }) => {
    const fileName = getDocumentFileName(document.url, document.label);
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);

    return (
        <TouchableOpacity style={styles.docPreview} onPress={() => Linking.openURL(getFullUrl(document.url))}>
            {isImage ? (
                // Используем URL самого документа, а не ad.photoUrl
                <Image source={{ uri: getFullUrl(document.url) }} style={styles.docImage} />
            ) : (
                <View style={styles.docFallback}>
                    <Text style={styles.docFallbackText}>{document.label.slice(0, 2).toUpperCase()}</Text>
                </View>
            )}
            <View style={styles.docMeta}>
                <Text style={styles.docLabel}>{document.label}</Text>
                <Text style={styles.docFileName} numberOfLines={1}>{fileName}</Text>
            </View>
        </TouchableOpacity>
    );
};
const Glyph = ({ children, size = 22, color = "#1C1C1E" }) => (
    <Text style={{ color, fontSize: size, fontWeight: "800", lineHeight: size + 2 }}>{children}</Text>
);

const InfoLine = ({ label, value }) => (
    <View style={styles.infoLine}>
        <Text style={styles.infoLineLabel}>{label}</Text>
        <Text style={styles.infoLineValue} numberOfLines={2}>{value || "-"}</Text>
    </View>
);

// ----------------------------------------------------------------------
// Компонент иконки загрузки (замена SVG)
// ----------------------------------------------------------------------
const DownloadIcon = ({ state }) => {
    if (state === "downloading") {
        return <ActivityIndicator size="small" color="#007AFF" />;
    }
    if (state === "done") {
        return <Glyph color="#34C759">✓</Glyph>;
    }
    return <Glyph color="#007AFF">↓</Glyph>;
};

// ----------------------------------------------------------------------
// ОСНОВНОЙ КОМПОНЕНТ AdminScreen
// ----------------------------------------------------------------------
export const AdminScreen = (props) => {
    const {
        adminStats,
        adminUsers,
        moderationAds,
        profile,
        userSearchQuery,
        setUserSearchQuery,
        adSearchQuery,
        setAdSearchQuery,
        searchUsers,
        searchAds,
        filteredUsers,
        filteredAds,
        openVerificationModal,
        openBlockModal,
        openModerationModal,
        formatMoney,
        adminApi,
        Modal, // не используется – заменим на RN Modal
        setError,
        setNotice,
        authToken,   // добавим токен из пропсов (вместо localStorage)
    } = props;

    const [verificationQueue, setVerificationQueue] = useState([]);
    const [verificationFilter, setVerificationFilter] = useState("pending");
    const [adModerationFilter, setAdModerationFilter] = useState("all");
    const [selectedAdminTable, setSelectedAdminTable] = useState("verifications");
    const [tablePage, setTablePage] = useState(0);
    const [verificationSearchQuery, setVerificationSearchQuery] = useState("");
    const [verificationAppliedSearch, setVerificationAppliedSearch] = useState("");
    const [userSearchApplied, setUserSearchApplied] = useState(false);
    const [adSearchApplied, setAdSearchApplied] = useState(false);
    const [decisionModal, setDecisionModal] = useState({ open: false, request: null, failureReason: "" });
    const [downloadStates, setDownloadStates] = useState({});
    const rowsPerPage = 15;

    // Фильтрация очереди верификаций
    const filteredVerificationQueue = useMemo(() => {
        const query = verificationAppliedSearch.trim().toLowerCase();
        if (!query) return verificationQueue;
        return verificationQueue.filter((request) =>
            request.userName?.toLowerCase().includes(query) ||
            request.phoneNumber?.includes(query) ||
            request.cadastralNumber?.toLowerCase().includes(query)
        );
    }, [verificationQueue, verificationAppliedSearch]);

    const userRows = userSearchApplied ? filteredUsers : adminUsers;
    const adRows = (adSearchApplied ? filteredAds : moderationAds).filter((ad) => {
        if (adModerationFilter === "all") return true;
        return (ad.moderationStatus || "").toLowerCase() === adModerationFilter;
    });

    const activeRows =
        selectedAdminTable === "users"
            ? userRows
            : selectedAdminTable === "ads"
                ? adRows
                : filteredVerificationQueue;
    const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));
    const pageRows = activeRows.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

    const searchPlaceholder =
        selectedAdminTable === "users"
            ? "Поиск по ФИО или телефону"
            : selectedAdminTable === "ads"
                ? "Поиск по названию, городу или владельцу"
                : "Поиск по ФИО, телефону или кадастру";

    const searchValue =
        selectedAdminTable === "users"
            ? userSearchQuery
            : selectedAdminTable === "ads"
                ? adSearchQuery
                : verificationSearchQuery;

    // Сброс страницы при смене фильтров/поиска
    useEffect(() => {
        setTablePage(0);
    }, [selectedAdminTable, verificationFilter, adModerationFilter, verificationAppliedSearch, userSearchApplied, adSearchApplied]);

    // Загрузка очереди верификаций
    useEffect(() => {
        let cancelled = false;
        async function loadQueue() {
            try {
                const data = await adminApi.listVerificationRequests(verificationFilter === "all" ? "" : verificationFilter);
                if (!cancelled) setVerificationQueue(Array.isArray(data) ? data : []);
            } catch (error) {
                if (!cancelled) setError(error.message);
            }
        }
        if (selectedAdminTable === "verifications") loadQueue();
        return () => { cancelled = true; };
    }, [adminApi, selectedAdminTable, setError, verificationFilter]);

    function updateSearch(value) {
        if (selectedAdminTable === "users") setUserSearchQuery(value);
        else if (selectedAdminTable === "ads") setAdSearchQuery(value);
        else setVerificationSearchQuery(value);
    }

    async function applySearch() {
        if (selectedAdminTable === "users") {
            await searchUsers();
            setUserSearchApplied(Boolean(userSearchQuery.trim()));
        } else if (selectedAdminTable === "ads") {
            await searchAds();
            setAdSearchApplied(Boolean(adSearchQuery.trim()));
        } else {
            setVerificationAppliedSearch(verificationSearchQuery);
        }
        setTablePage(0);
    }

    async function submitVerificationDecision(status) {
        if (!decisionModal.request) return;
        try {
            await adminApi.decideVerificationRequest(decisionModal.request.id, {
                status,
                failureReason: status === "rejected" ? decisionModal.failureReason : null,
            });
            setNotice("Заявка на верификацию обновлена.");
            setDecisionModal({ open: false, request: null, failureReason: "" });
            const data = await adminApi.listVerificationRequests(verificationFilter === "all" ? "" : verificationFilter);
            setVerificationQueue(Array.isArray(data) ? data : []);
        } catch (error) {
            setError(error.message);
        }
    }

    // Скачивание документа – открываем ссылку в браузере (можно улучшить)
    async function handleDocumentDownload(document) {
        setDownloadStates((prev) => ({ ...prev, [document.key]: "downloading" }));
        try {
            // Просто открываем URL (пользователь сможет сохранить через браузер)
            await Linking.openURL(assetUrl(document.url));
            setDownloadStates((prev) => ({ ...prev, [document.key]: "done" }));
            setTimeout(() => {
                setDownloadStates((prev) => ({ ...prev, [document.key]: "idle" }));
            }, 2000);
        } catch (error) {
            setDownloadStates((prev) => ({ ...prev, [document.key]: "idle" }));
            setError(error.message || "Не удалось открыть документ.");
        }
    }

    // Рендер строки таблицы для очереди верификаций
    const renderVerificationRow = ({ item: request }) => (
        <View style={styles.mobileRowCard}>
            <View style={styles.rowCardTop}>
                <View style={styles.rowIndex}><Text style={styles.rowIndexText}>{request.id}</Text></View>
                <View style={styles.rowMain}>
                    <Text style={styles.cellTextBold}>{request.userName}</Text>
                    <Text style={styles.cellSubtext}>{request.phoneNumber}</Text>
                </View>
                <Text style={styles.statusPill}>{formatVerificationStatus(request.status)}</Text>
            </View>
            <InfoLine label="Тип" value={formatVerificationType(request.verificationType)} />
            <InfoLine label="Кадастр" value={request.cadastralNumber || "-"} />
            <TouchableOpacity
                style={styles.smallBtnPrimary}
                onPress={() => setDecisionModal({ open: true, request, failureReason: "" })}
            >
                <Text style={styles.smallBtnText}>Рассмотреть</Text>
            </TouchableOpacity>
        </View>
    );

    // Рендер строки пользователей
    const renderUserRow = ({ item: user }) => {
        const isCurrentUser = user.id === profile?.id;
        const canRevokeVerification = (user.role || "").toLowerCase() === "landlord";
        return (
            <View style={styles.mobileRowCard}>
                <View style={styles.rowCardTop}>
                    <View style={styles.rowIndex}><Text style={styles.rowIndexText}>{user.id}</Text></View>
                    <View style={styles.rowMain}>
                        <Text style={styles.cellTextBold}>{compactName(user.fullName) || user.fullName}{isCurrentUser ? " (вы)" : ""}</Text>
                        <Text style={styles.cellSubtext}>{user.phoneNumber}</Text>
                    </View>
                    <Text style={[styles.statusPill, user.blocked && styles.statusPillDanger]}>{user.blocked ? "Блок" : "Активен"}</Text>
                </View>
                <InfoLine label="Роль" value={roleLabel(user.role)} />
                <InfoLine label="Верификация" value={formatUserVerificationStatus(user.verificationStatus, user.verified)} />
                <View style={styles.rowActions}>
                    <TouchableOpacity
                        style={[styles.smallBtnSecondary, (user.blocked || (user.verified && !canRevokeVerification)) && styles.disabledButton]}
                        onPress={() => openVerificationModal(user)}
                        disabled={user.blocked || (user.verified && !canRevokeVerification)}
                    >
                        <Text style={styles.smallBtnTextDark}>{user.verified ? "Снять верификацию" : "Верифицировать"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.smallBtnDanger}
                        onPress={() => openBlockModal(user)}
                    >
                        <Text style={styles.smallBtnText}>{user.blocked ? "Разблокировать" : "Заблокировать"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Рендер строки объявлений
    const renderAdRow = ({ item: ad, index }) => {
        const isOwnAd = ad.ownerId === profile?.id;
        return (
            <View style={styles.mobileRowCard}>
                <View style={styles.rowCardTop}>
                    <View style={styles.rowIndex}><Text style={styles.rowIndexText}>{index + 1 + tablePage * rowsPerPage}</Text></View>
                    <View style={styles.rowMain}>
                        <Text style={styles.cellTextBold}>{ad.title}</Text>
                        <Text style={styles.cellSubtext}>
                            {ad.city || "-"} · {formatMoney(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth)}
                        </Text>
                    </View>
                </View>
                <InfoLine label="Владелец" value={`${ad.userFullName || "Неизвестно"}${isOwnAd ? " (ваше)" : ""}`} />
                <InfoLine label="Телефон" value={ad.userPhone || "-"} />
                <TouchableOpacity style={styles.smallBtnPrimary} onPress={() => openModerationModal(ad)}>
                    <Text style={styles.smallBtnText}>Подробнее</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Компонент пагинации
    const Pagination = () => (
        totalPages > 1 ? (
            <View style={styles.pagination}>
                <TouchableOpacity
                    style={[styles.paginationButton, tablePage === 0 && styles.disabledButton]}
                    onPress={() => setTablePage(Math.max(0, tablePage - 1))}
                    disabled={tablePage === 0}
                >
                    <Glyph color={tablePage === 0 ? "#C6C6C8" : "#007AFF"}>‹</Glyph>
                </TouchableOpacity>
                <Text style={styles.paginationText}>Страница {tablePage + 1} из {totalPages}</Text>
                <TouchableOpacity
                    style={[styles.paginationButton, tablePage === totalPages - 1 && styles.disabledButton]}
                    onPress={() => setTablePage(Math.min(totalPages - 1, tablePage + 1))}
                    disabled={tablePage === totalPages - 1}
                >
                    <Glyph color={tablePage === totalPages - 1 ? "#C6C6C8" : "#007AFF"}>›</Glyph>
                </TouchableOpacity>
            </View>
        ) : null
    );

    // Модальное окно принятия решения
    const DecisionModal = () => (
        <RNModal
            visible={decisionModal.open}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setDecisionModal({ open: false, request: null, failureReason: "" })}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.eyebrow}>Заявка на верификацию</Text>
                            <Text style={styles.modalTitle}>{decisionModal.request?.userName || "Пользователь"}</Text>
                            <Text style={styles.modalSubtitle}>
                                {formatVerificationType(decisionModal.request?.verificationType)} ·{" "}
                                {formatVerificationStatus(decisionModal.request?.status)}
                            </Text>
                        </View>

                        <View style={styles.infoGrid}>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>Телефон</Text>
                                <Text style={styles.infoValue}>{decisionModal.request?.phoneNumber || "-"}</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>Кадастровый номер</Text>
                                <Text style={styles.infoValue}>{decisionModal.request?.cadastralNumber || "-"}</Text>
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionLabel}>Комментарий пользователя</Text>
                            <Text style={styles.commentText}>
                                {parseRequestData(decisionModal.request).note || "Комментарий не указан."}
                            </Text>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionLabel}>Паспортные данные</Text>
                            <View style={styles.passportList}>
                                <Text><Text style={styles.bold}>Гражданство:</Text> {decisionModal.request?.passportCitizenship || "-"}</Text>
                                <Text><Text style={styles.bold}>Паспорт:</Text> {decisionModal.request?.passportNumber || "-"}</Text>
                                <Text><Text style={styles.bold}>Кем выдан:</Text> {decisionModal.request?.passportIssuedBy || "-"}</Text>
                                <Text><Text style={styles.bold}>Дата выдачи:</Text> {decisionModal.request?.passportIssuedAt || "-"}</Text>
                                <Text><Text style={styles.bold}>Регистрация:</Text> {decisionModal.request?.passportRegistrationAddress || "-"}</Text>
                            </View>
                        </View>

                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionLabel}>Полученные документы</Text>
                            {getRequestDocuments(decisionModal.request).length ? (
                                getRequestDocuments(decisionModal.request).map((doc) => (
                                    <View key={doc.key} style={styles.documentRow}>
                                        <VerificationDocumentPreview document={doc} />
                                        <TouchableOpacity
                                            style={styles.downloadButton}
                                            onPress={() => handleDocumentDownload(doc)}
                                        >
                                            <DownloadIcon state={downloadStates[doc.key]} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>Документы не приложены.</Text>
                            )}
                        </View>

                        <View style={styles.decisionPanel}>
                            <Text style={styles.decisionTitle}>Решение</Text>
                            <Text style={styles.decisionSubtitle}>При отказе укажите причину</Text>
                            <TextInput
                                style={styles.reasonInput}
                                multiline
                                numberOfLines={4}
                                placeholder="Причина отказа"
                                value={decisionModal.failureReason}
                                onChangeText={(text) => setDecisionModal((prev) => ({ ...prev, failureReason: text }))}
                            />
                            <View style={styles.decisionActions}>
                                <TouchableOpacity
                                    style={styles.dangerButton}
                                    onPress={() => submitVerificationDecision("rejected")}
                                >
                                    <Text style={styles.dangerButtonText}>Отклонить</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => submitVerificationDecision("approved")}
                                >
                                    <Text style={styles.primaryButtonText}>Одобрить</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeModalButton}
                        onPress={() => setDecisionModal({ open: false, request: null, failureReason: "" })}
                    >
                        <Glyph size={24}>×</Glyph>
                    </TouchableOpacity>
                </View>
            </View>
        </RNModal>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.adminHeader}>
                    <Text style={styles.headerTitle}>Админ-панель</Text>
                    <Text style={styles.headerSubtitle}>Модерация объявлений, пользователей и двухуровневой верификации арендодателей.</Text>
                </View>

                <View style={styles.statsContainer}>
                    <Text style={styles.statsHeading}>Сводка платформы</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Пользователи</Text><Text style={styles.statValue}>{adminStats?.usersCount || 0}</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Объявления</Text><Text style={styles.statValue}>{adminStats?.adsCount || 0}</Text></View>
                        <View style={[styles.statCard, styles.successCard]}><Text style={styles.statLabel}>Одобрено</Text><Text style={styles.statValue}>{adminStats?.approvedAdsCount || adminStats?.activeAdsCount || 0}</Text></View>
                        <View style={[styles.statCard, styles.warningCard]}><Text style={styles.statLabel}>На модерации</Text><Text style={styles.statValue}>{adminStats?.pendingAdsCount || 0}</Text></View>
                        <View style={styles.statCard}><Text style={styles.statLabel}>Верифицированы</Text><Text style={styles.statValue}>{adminUsers.filter((u) => u.verified).length}</Text></View>
                        <View style={[styles.statCard, styles.dangerCard]}><Text style={styles.statLabel}>Заблокированы</Text><Text style={styles.statValue}>{adminUsers.filter((u) => u.blocked).length}</Text></View>
                    </View>
                </View>

                <View style={styles.controlsBar}>
                    <View style={styles.searchBox}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChangeText={updateSearch}
                        />
                        <TouchableOpacity style={styles.searchButton} onPress={applySearch}>
                            <Text style={styles.searchButtonText}>Найти</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.tablePicker}>
                        <View style={styles.segmented}>
                            <TouchableOpacity
                                style={[styles.segment, selectedAdminTable === "verifications" && styles.segmentActive]}
                                onPress={() => setSelectedAdminTable("verifications")}
                            >
                                <Text style={[styles.segmentText, selectedAdminTable === "verifications" && styles.segmentTextActive]}>Очередь верификаций</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, selectedAdminTable === "users" && styles.segmentActive]}
                                onPress={() => setSelectedAdminTable("users")}
                            >
                                <Text style={[styles.segmentText, selectedAdminTable === "users" && styles.segmentTextActive]}>Пользователи</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, selectedAdminTable === "ads" && styles.segmentActive]}
                                onPress={() => setSelectedAdminTable("ads")}
                            >
                                <Text style={[styles.segmentText, selectedAdminTable === "ads" && styles.segmentTextActive]}>Модерация объявлений</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {selectedAdminTable === "verifications" && (
                    <View style={styles.tableContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Очередь верификаций</Text>
                            <View style={styles.filterSegmented}>
                                <TouchableOpacity
                                    style={[styles.filterSegment, verificationFilter === "pending" && styles.filterSegmentActive]}
                                    onPress={() => setVerificationFilter("pending")}
                                >
                                    <Text style={styles.filterSegmentText}>На модерации</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterSegment, verificationFilter === "approved" && styles.filterSegmentActive]}
                                    onPress={() => setVerificationFilter("approved")}
                                >
                                    <Text style={styles.filterSegmentText}>Одобрены</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterSegment, verificationFilter === "rejected" && styles.filterSegmentActive]}
                                    onPress={() => setVerificationFilter("rejected")}
                                >
                                    <Text style={styles.filterSegmentText}>Отклонены</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <FlatList
                            data={pageRows}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={renderVerificationRow}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Нет заявок</Text>}
                            scrollEnabled={false}
                        />
                        <Pagination />
                    </View>
                )}

                {selectedAdminTable === "users" && (
                    <View style={styles.tableContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Пользователи</Text>
                        </View>
                        <FlatList
                            data={pageRows}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={renderUserRow}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Нет пользователей</Text>}
                            scrollEnabled={false}
                        />
                        <Pagination />
                    </View>
                )}

                {selectedAdminTable === "ads" && (
                    <View style={styles.tableContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Модерация объявлений</Text>
                            <View style={styles.filterSegmented}>
                                <TouchableOpacity
                                    style={[styles.filterSegment, adModerationFilter === "all" && styles.filterSegmentActive]}
                                    onPress={() => setAdModerationFilter("all")}
                                >
                                    <Text style={styles.filterSegmentText}>Все</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterSegment, adModerationFilter === "approved" && styles.filterSegmentActive]}
                                    onPress={() => setAdModerationFilter("approved")}
                                >
                                    <Text style={styles.filterSegmentText}>Одобрены</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterSegment, adModerationFilter === "pending" && styles.filterSegmentActive]}
                                    onPress={() => setAdModerationFilter("pending")}
                                >
                                    <Text style={styles.filterSegmentText}>На модерации</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterSegment, adModerationFilter === "rejected" && styles.filterSegmentActive]}
                                    onPress={() => setAdModerationFilter("rejected")}
                                >
                                    <Text style={styles.filterSegmentText}>Отклонены</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <FlatList
                            data={pageRows}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item, index }) => renderAdRow({ item, index })}
                            ListEmptyComponent={<Text style={styles.emptyListText}>Нет объявлений</Text>}
                            scrollEnabled={false}
                        />
                        <Pagination />
                    </View>
                )}

                <DecisionModal />
            </ScrollView>
        </SafeAreaView>
    );
};

// ----------------------------------------------------------------------
// СТИЛИ
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F2F2F7" },
    container: { flex: 1 },
    adminHeader: { backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingVertical: 22, marginBottom: 14, borderRadius: 18, marginHorizontal: 16, marginTop: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    headerTitle: { fontSize: 26, lineHeight: 31, fontWeight: "800", color: "#1C1C1E" },
    headerSubtitle: { fontSize: 14, lineHeight: 19, color: "#8E8E93", marginTop: 6 },
    statsContainer: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 16, marginHorizontal: 16, borderRadius: 18, marginBottom: 14 },
    statsHeading: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
    statCard: { width: "30%", minHeight: 82, backgroundColor: "#F2F2F7", borderRadius: 14, padding: 10, alignItems: "center", justifyContent: "center" },
    statLabel: { fontSize: 12, color: "#8E8E93" },
    statValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
    successCard: { backgroundColor: "#E5F5E9" },
    warningCard: { backgroundColor: "#FFF5E5" },
    dangerCard: { backgroundColor: "#FFEBEE" },
    controlsBar: { marginHorizontal: 16, marginBottom: 14 },
    searchBox: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, alignItems: "center" },
    searchInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
    searchButton: { backgroundColor: "#007AFF", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 8 },
    searchButtonText: { color: "#FFF", fontWeight: "600" },
    tablePicker: { backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden" },
    segmented: { flexDirection: "row", flexWrap: "wrap" },
    segment: { flexGrow: 1, flexBasis: "32%", minHeight: 52, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
    segmentActive: { backgroundColor: "#007AFF" },
    segmentText: { fontSize: 14, color: "#1C1C1E" },
    segmentTextActive: { color: "#FFF", fontWeight: "500" },
    tableContainer: { backgroundColor: "#FFFFFF", marginHorizontal: 16, borderRadius: 18, marginBottom: 16, padding: 14 },
    sectionHeader: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E5EA", paddingBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: "600" },
    filterSegmented: { flexDirection: "row", marginTop: 8, gap: 8, flexWrap: "wrap" },
    filterSegment: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F2F2F7" },
    filterSegmentActive: { backgroundColor: "#007AFF" },
    filterSegmentText: { fontSize: 13, color: "#1C1C1E" },
    // Стили табличных строк
    tableRow: { flexDirection: "row", flexWrap: "wrap", borderBottomWidth: 1, borderBottomColor: "#E5E5EA", paddingVertical: 12, alignItems: "center" },
    tableCell: { paddingHorizontal: 4, marginBottom: 4 },
    cellId: { width: 50 },
    cellUser: { width: 120 },
    cellUserFull: { width: 150 },
    cellType: { width: 100 },
    cellStatus: { width: 90 },
    cellCadastral: { width: 120 },
    cellPhone: { width: 100 },
    cellRole: { width: 90 },
    cellVerif: { width: 100 },
    cellBlocked: { width: 90 },
    cellIndex: { width: 50 },
    cellTitle: { width: 150 },
    cellOwner: { width: 130 },
    cellCity: { width: 100 },
    cellPrice: { width: 100 },
    cellActions: { width: 140, alignItems: "flex-start" },
    cellText: { fontSize: 13, color: "#1C1C1E" },
    cellTextBold: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
    cellSubtext: { fontSize: 11, color: "#8E8E93" },
    mobileRowCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#EFEFF4", padding: 14, marginBottom: 12 },
    rowCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    rowIndex: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F2F2F7", justifyContent: "center", alignItems: "center", marginRight: 10 },
    rowIndexText: { fontWeight: "800", color: "#3A3A3C" },
    rowMain: { flex: 1, paddingRight: 8 },
    rowActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 },
    statusPill: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#E5F0FF", color: "#007AFF", fontSize: 12, fontWeight: "700" },
    statusPillDanger: { backgroundColor: "#FFE8E8", color: "#FF3B30" },
    infoLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#F2F2F7" },
    infoLineLabel: { color: "#8E8E93", fontSize: 13 },
    infoLineValue: { flex: 1, textAlign: "right", color: "#1C1C1E", fontSize: 13, fontWeight: "600" },
    smallBtnPrimary: { backgroundColor: "#007AFF", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignItems: "center", marginTop: 10 },
    smallBtnSecondary: { backgroundColor: "#F2F2F7", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
    smallBtnDanger: { backgroundColor: "#FF3B30", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
    smallBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
    smallBtnTextDark: { color: "#1C1C1E", fontSize: 13, fontWeight: "700" },
    marginTopSmall: { marginTop: 4 },
    disabledButton: { opacity: 0.5 },
    pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 16 },
    paginationButton: { padding: 8 },
    paginationText: { fontSize: 14, color: "#1C1C1E" },
    emptyListText: { textAlign: "center", paddingVertical: 24, color: "#8E8E93" },
    // Модальное окно
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContainer: { backgroundColor: "#FFF", borderRadius: 24, width: "90%", maxHeight: "90%", padding: 20, position: "relative" },
    closeModalButton: { position: "absolute", top: 12, right: 12, zIndex: 1 },
    modalHeader: { marginBottom: 16 },
    eyebrow: { fontSize: 12, color: "#8E8E93", textTransform: "uppercase" },
    modalTitle: { fontSize: 22, fontWeight: "700", marginTop: 4 },
    modalSubtitle: { fontSize: 14, color: "#8E8E93", marginTop: 2 },
    infoGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
    infoCard: { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 12, padding: 12 },
    infoLabel: { fontSize: 12, color: "#8E8E93" },
    infoValue: { fontSize: 14, fontWeight: "500", marginTop: 4 },
    sectionCard: { marginBottom: 16, backgroundColor: "#F9F9FC", borderRadius: 12, padding: 12 },
    sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
    commentText: { fontSize: 14, color: "#1C1C1E" },
    passportList: { gap: 4 },
    bold: { fontWeight: "600" },
    documentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    docPreview: { flexDirection: "row", alignItems: "center", flex: 1, backgroundColor: "#F2F2F7", borderRadius: 8, padding: 8 },
    docImage: { width: 40, height: 40, borderRadius: 4, marginRight: 8 },
    docFallback: { width: 40, height: 40, borderRadius: 4, backgroundColor: "#C6C6C8", justifyContent: "center", alignItems: "center", marginRight: 8 },
    docFallbackText: { color: "#FFF", fontWeight: "bold" },
    docMeta: { flex: 1 },
    docLabel: { fontSize: 12, fontWeight: "500" },
    docFileName: { fontSize: 10, color: "#8E8E93" },
    downloadButton: { padding: 8 },
    emptyText: { fontSize: 13, color: "#8E8E93", fontStyle: "italic" },
    decisionPanel: { marginTop: 8, borderTopWidth: 1, borderTopColor: "#E5E5EA", paddingTop: 16 },
    decisionTitle: { fontSize: 18, fontWeight: "600" },
    decisionSubtitle: { fontSize: 13, color: "#8E8E93", marginBottom: 12 },
    reasonInput: { backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: "top", minHeight: 80, marginBottom: 16 },
    decisionActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
    dangerButton: { backgroundColor: "#FF3B30", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
    dangerButtonText: { color: "#FFF", fontWeight: "600" },
    primaryButton: { backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
    primaryButtonText: { color: "#FFF", fontWeight: "600" },
});
