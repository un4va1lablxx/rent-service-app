import { useEffect, useMemo, useState } from "react";
import { roleLabel } from "../shared/formatters";

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
        ["passportDocumentUrl", "Паспорт"],
        ["snilsDocumentUrl", "СНИЛС"],
        ["egrnDocumentUrl", "Выписка ЕГРН"]
    ]
        .map(([key, label]) => ({ key, label, url: data[key] }))
        .filter((document) => Boolean(document.url));
}

function getDocumentFileName(url, fallbackLabel) {
    if (!url) {
        return fallbackLabel;
    }
    try {
        const parsedUrl = new URL(url, window.location.origin);
        const rawName = parsedUrl.pathname.split("/").pop() || fallbackLabel;
        return decodeURIComponent(rawName);
    } catch {
        const rawName = String(url).split("/").pop() || fallbackLabel;
        return decodeURIComponent(rawName);
    }
}

function VerificationDocumentPreview({ document }) {
    const fileName = getDocumentFileName(document.url, document.label);
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(fileName);

    return (
        <div className="verification-file-preview verification-document-preview">
            {isImage ? (
                <img src={document.url} alt={document.label} />
            ) : (
                <div className="verification-file-fallback">{document.label.slice(0, 2).toUpperCase()}</div>
            )}
            <div className="verification-file-meta">
                <strong>{document.label}</strong>
                <small>{fileName}</small>
            </div>
        </div>
    );
}

function DownloadIcon({ state }) {
    if (state === "downloading") {
        return (
            <span className="download-progress" aria-hidden="true">
                <span>×</span>
            </span>
        );
    }

    if (state === "done") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function AdminScreen(props) {
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
        Modal,
        setError,
        setNotice
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

    const filteredVerificationQueue = useMemo(() => {
        const query = verificationAppliedSearch.trim().toLowerCase();
        if (!query) {
            return verificationQueue;
        }
        return verificationQueue.filter((request) =>
            request.userName?.toLowerCase().includes(query)
            || request.phoneNumber?.includes(query)
            || request.cadastralNumber?.toLowerCase().includes(query)
        );
    }, [verificationQueue, verificationAppliedSearch]);

    const userRows = userSearchApplied ? filteredUsers : adminUsers;
    const adRows = (adSearchApplied ? filteredAds : moderationAds).filter((ad) => {
        if (adModerationFilter === "all") return true;
        return (ad.moderationStatus || "").toLowerCase() === adModerationFilter;
    });

    const activeRows = selectedAdminTable === "users"
        ? userRows
        : selectedAdminTable === "ads"
            ? adRows
            : filteredVerificationQueue;
    const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));
    const pageRows = activeRows.slice(tablePage * rowsPerPage, (tablePage + 1) * rowsPerPage);

    const searchPlaceholder = selectedAdminTable === "users"
        ? "Поиск по ФИО или телефону"
        : selectedAdminTable === "ads"
            ? "Поиск по названию, городу или владельцу"
            : "Поиск по ФИО, телефону или кадастру";

    const searchValue = selectedAdminTable === "users"
        ? userSearchQuery
        : selectedAdminTable === "ads"
            ? adSearchQuery
            : verificationSearchQuery;

    useEffect(() => {
        setTablePage(0);
    }, [selectedAdminTable, verificationFilter, adModerationFilter, verificationAppliedSearch, userSearchApplied, adSearchApplied]);

    useEffect(() => {
        let cancelled = false;

        async function loadQueue() {
            try {
                const data = await adminApi.listVerificationRequests(verificationFilter === "all" ? "" : verificationFilter);
                if (!cancelled) {
                    setVerificationQueue(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(error.message);
                }
            }
        }

        if (selectedAdminTable === "verifications") {
            loadQueue();
        }

        return () => {
            cancelled = true;
        };
    }, [adminApi, selectedAdminTable, setError, verificationFilter]);

    function updateSearch(value) {
        if (selectedAdminTable === "users") {
            setUserSearchQuery(value);
        } else if (selectedAdminTable === "ads") {
            setAdSearchQuery(value);
        } else {
            setVerificationSearchQuery(value);
        }
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
        if (!decisionModal.request) {
            return;
        }

        try {
            await adminApi.decideVerificationRequest(decisionModal.request.id, {
                status,
                failureReason: status === "rejected" ? decisionModal.failureReason : null
            });
            setNotice("Заявка на верификацию обновлена.");
            setDecisionModal({ open: false, request: null, failureReason: "" });
            const data = await adminApi.listVerificationRequests(verificationFilter === "all" ? "" : verificationFilter);
            setVerificationQueue(Array.isArray(data) ? data : []);
        } catch (error) {
            setError(error.message);
        }
    }

    async function handleDocumentDownload(document) {
        setDownloadStates((current) => ({ ...current, [document.key]: "downloading" }));
        try {
            const token = localStorage.getItem("rent-service-token");
            const headers = new Headers();
            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }

            const response = await fetch(document.url, { headers });
            if (!response.ok) {
                throw new Error(`Не удалось скачать документ (${response.status})`);
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = window.document.createElement("a");
            link.href = objectUrl;
            link.download = getDocumentFileName(document.url, document.label);
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
            setDownloadStates((current) => ({ ...current, [document.key]: "done" }));
        } catch (error) {
            setDownloadStates((current) => ({ ...current, [document.key]: "idle" }));
            setError(error.message || "Не удалось скачать документ.");
        }
    }

    return (
        <div className="admin-container">
            <div className="admin-header glass">
                <h1>Админ-панель</h1>
                <p>Модерация объявлений, пользователей и двухуровневой верификации арендодателей.</p>
            </div>

            <div className="stats-container glass">
                <h3>Сводка платформы</h3>
                <div className="stats-grid">
                    <div className="stat-card"><span className="stat-label">Пользователи</span><strong>{adminStats?.usersCount || 0}</strong></div>
                    <div className="stat-card"><span className="stat-label">Объявления</span><strong>{adminStats?.adsCount || 0}</strong></div>
                    <div className="stat-card success"><span className="stat-label">Одобрено</span><strong>{adminStats?.approvedAdsCount || adminStats?.activeAdsCount || 0}</strong></div>
                    <div className="stat-card warning"><span className="stat-label">На модерации</span><strong>{adminStats?.pendingAdsCount || 0}</strong></div>
                    <div className="stat-card"><span className="stat-label">Верифицированы</span><strong>{adminUsers.filter((user) => user.verified).length}</strong></div>
                    <div className="stat-card danger"><span className="stat-label">Заблокированы</span><strong>{adminUsers.filter((user) => user.blocked).length}</strong></div>
                </div>
            </div>

            <div className="admin-controls-bar">
                <div className="admin-search-box glass">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(event) => updateSearch(event.target.value)}
                        className="search-input"
                    />
                    <button className="search-btn" type="button" onClick={applySearch}>Найти</button>
                </div>
                <div className="admin-table-picker glass">
                    <div className="segmented admin-table-switch">
                        <button className={selectedAdminTable === "verifications" ? "active" : ""} type="button" onClick={() => setSelectedAdminTable("verifications")}>
                            Очередь верификаций
                        </button>
                        <button className={selectedAdminTable === "users" ? "active" : ""} type="button" onClick={() => setSelectedAdminTable("users")}>
                            Пользователи
                        </button>
                        <button className={selectedAdminTable === "ads" ? "active" : ""} type="button" onClick={() => setSelectedAdminTable("ads")}>
                            Модерация объявлений
                        </button>
                    </div>
                </div>
            </div>

            {selectedAdminTable === "verifications" && (
                <div className="verification-queue-container glass">
                    <div className="section-header stacked">
                        <div className="header-title">
                            <h3>Очередь верификаций</h3>
                        </div>
                        <div className="segmented admin-filter-switch">
                            <button className={verificationFilter === "pending" ? "active" : ""} type="button" onClick={() => setVerificationFilter("pending")}>На модерации</button>
                            <button className={verificationFilter === "approved" ? "active" : ""} type="button" onClick={() => setVerificationFilter("approved")}>Одобрены</button>
                            <button className={verificationFilter === "rejected" ? "active" : ""} type="button" onClick={() => setVerificationFilter("rejected")}>Отклонены</button>
                        </div>
                    </div>

                    <div className="users-table">
                        <table>
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Пользователь</th>
                                <th>Тип</th>
                                <th>Статус</th>
                                <th>Кадастровый номер</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.map((request) => (
                                <tr key={request.id}>
                                    <td data-label="ID">{request.id}</td>
                                    <td data-label="Пользователь"><strong>{request.userName}</strong><div>{request.phoneNumber}</div></td>
                                    <td data-label="Тип">{formatVerificationType(request.verificationType)}</td>
                                    <td data-label="Статус">{formatVerificationStatus(request.status)}</td>
                                    <td data-label="Кадастровый номер">{request.cadastralNumber || "-"}</td>
                                    <td data-label="Действия" className="actions-cell">
                                        <button className="small-btn primary" type="button" onClick={() => setDecisionModal({ open: true, request, failureReason: "" })}>
                                            Рассмотреть
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button type="button" onClick={() => setTablePage(Math.max(0, tablePage - 1))} disabled={tablePage === 0}>←</button>
                            <span>Страница {tablePage + 1} из {totalPages}</span>
                            <button type="button" onClick={() => setTablePage(Math.min(totalPages - 1, tablePage + 1))} disabled={tablePage === totalPages - 1}>→</button>
                        </div>
                    )}
                </div>
            )}

            {selectedAdminTable === "users" && (
                <div className="users-container glass">
                    <div className="section-header">
                        <div className="header-title"><h3>Пользователи</h3></div>
                    </div>
                    <div className="users-table">
                        <table>
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>ФИО</th>
                                <th>Телефон</th>
                                <th>Роль</th>
                                <th>Верификация</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageRows.map((user) => {
                                const isCurrentUser = user.id === profile?.id;
                                const canRevokeVerification = (user.role || "").toLowerCase() === "landlord";
                                return (
                                    <tr key={user.id}>
                                        <td data-label="ID">{user.id}</td>
                                        <td data-label="ФИО">{user.fullName}{isCurrentUser ? " (вы)" : ""}</td>
                                        <td data-label="Телефон">{user.phoneNumber}</td>
                                        <td data-label="Роль">{roleLabel(user.role)}</td>
                                        <td data-label="Верификация">{formatUserVerificationStatus(user.verificationStatus, user.verified)}</td>
                                        <td data-label="Статус">{user.blocked ? "Заблокирован" : "Активен"}</td>
                                        <td data-label="Действия" className="actions-cell">
                                            <button className="small-btn secondary" type="button" onClick={() => openVerificationModal(user)} disabled={user.blocked || (user.verified && !canRevokeVerification)}>
                                                {user.verified ? "Снять верификацию" : "Верифицировать"}
                                            </button>
                                            <button className="small-btn danger" type="button" onClick={() => openBlockModal(user)}>
                                                {user.blocked ? "Разблокировать" : "Заблокировать"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button type="button" onClick={() => setTablePage(Math.max(0, tablePage - 1))} disabled={tablePage === 0}>←</button>
                            <span>Страница {tablePage + 1} из {totalPages}</span>
                            <button type="button" onClick={() => setTablePage(Math.min(totalPages - 1, tablePage + 1))} disabled={tablePage === totalPages - 1}>→</button>
                        </div>
                    )}
                </div>
            )}

            {selectedAdminTable === "ads" && (
                <div className="moderation-container glass">
                    <div className="section-header stacked">
                        <div className="header-title"><h3>Модерация объявлений</h3></div>
                        <div className="segmented admin-filter-switch">
                            <button className={adModerationFilter === "all" ? "active" : ""} type="button" onClick={() => setAdModerationFilter("all")}>Все</button>
                            <button className={adModerationFilter === "approved" ? "active" : ""} type="button" onClick={() => setAdModerationFilter("approved")}>Одобрены</button>
                            <button className={adModerationFilter === "pending" ? "active" : ""} type="button" onClick={() => setAdModerationFilter("pending")}>На модерации</button>
                            <button className={adModerationFilter === "rejected" ? "active" : ""} type="button" onClick={() => setAdModerationFilter("rejected")}>Отклонены</button>
                        </div>
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
                            {pageRows.map((ad, index) => {
                                const isOwnAd = ad.ownerId === profile?.id;
                                return (
                                    <tr key={ad.id}>
                                        <td data-label="№">{index + 1 + tablePage * rowsPerPage}</td>
                                        <td data-label="Название">{ad.title}</td>
                                        <td data-label="Владелец">{ad.userFullName || "Неизвестно"}{isOwnAd ? " (ваше)" : ""}</td>
                                        <td data-label="Город">{ad.city}</td>
                                        <td data-label="Телефон">{ad.userPhone || "-"}</td>
                                        <td data-label="Цена">{formatMoney(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth)}</td>
                                        <td data-label="Действия" className="actions-cell">
                                            <button
                                                className="small-btn primary"
                                                type="button"
                                                onClick={() => openModerationModal(ad)}
                                            >
                                                Подробнее
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button type="button" onClick={() => setTablePage(Math.max(0, tablePage - 1))} disabled={tablePage === 0}>←</button>
                            <span>Страница {tablePage + 1} из {totalPages}</span>
                            <button type="button" onClick={() => setTablePage(Math.min(totalPages - 1, tablePage + 1))} disabled={tablePage === totalPages - 1}>→</button>
                        </div>
                    )}
                </div>
            )}

            {decisionModal.open && (
                <Modal
                    onClose={() => setDecisionModal({
                        open: false,
                        request: null,
                        failureReason: ""
                    })}
                    wide
                >
                <div className="verification-modal-shell">
                    <section className="verification-modal-main">
                        <div className="verification-modal-header">
                            <span className="eyebrow">Заявка на верификацию</span>
                            <h2>{decisionModal.request?.userName || "Пользователь"}</h2>
                            <p>
                                {formatVerificationType(decisionModal.request?.verificationType)} ·{" "}
                                {formatVerificationStatus(decisionModal.request?.status)}
                            </p>
                        </div>

                        <div className="verification-info-grid">
                            <div className="verification-info-card">
                                <span>Телефон</span>
                                <strong>{decisionModal.request?.phoneNumber || "-"}</strong>
                            </div>
                            <div className="verification-info-card">
                                <span>Кадастровый номер</span>
                                <strong>{decisionModal.request?.cadastralNumber || "-"}</strong>
                            </div>
                        </div>

                        <div className="verification-section-card">
                            <span>Комментарий пользователя</span>
                            <p>{parseRequestData(decisionModal.request).note || "Комментарий не указан."}</p>
                        </div>

                        <div className="verification-section-card">
                            <span>Паспортные данные</span>
                            <div className="verification-passport-list">
                                <p><strong>Гражданство:</strong> {decisionModal.request?.passportCitizenship || "-"}</p>
                                <p><strong>Паспорт:</strong> {decisionModal.request?.passportNumber || "-"}</p>
                                <p><strong>Кем выдан:</strong> {decisionModal.request?.passportIssuedBy || "-"}</p>
                                <p><strong>Дата выдачи:</strong> {decisionModal.request?.passportIssuedAt || "-"}</p>
                                <p><strong>Регистрация:</strong> {decisionModal.request?.passportRegistrationAddress || "-"}</p>
                            </div>
                        </div>

                        <div className="verification-section-card">
                            <div className="verification-section-title">
                                <span>Полученные документы</span>
                            </div>

                            <div className="verification-documents-list">
                                {getRequestDocuments(decisionModal.request).length ? (
                                    getRequestDocuments(decisionModal.request).map((document) => (
                                        <div className="verification-document-row" key={document.key}>
                                            <VerificationDocumentPreview document={document} />
                                            <button
                                                className={`document-download-button ${downloadStates[document.key] === "done" ? "done" : ""}`}
                                                type="button"
                                                onClick={() => handleDocumentDownload(document)}
                                                title="Скачать документ"
                                            >
                                                <DownloadIcon state={downloadStates[document.key]} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-inline">Документы не приложены.</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <aside className="verification-decision-panel">
                        <div>
                            <span className="eyebrow">Решение</span>
                            <h3>Вынесите решение</h3>
                            <p>При отказе укажите причину — пользователь увидит её в профиле.</p>
                        </div>

                        <textarea
                            className="reason-input"
                            rows="6"
                            placeholder="Причина отказа"
                            value={decisionModal.failureReason}
                            onChange={(event) =>
                                setDecisionModal((current) => ({
                                    ...current,
                                    failureReason: event.target.value
                                }))
                            }
                        />

                        <div className="verification-decision-actions">
                            <button
                                className="danger-button"
                                type="button"
                                onClick={() => submitVerificationDecision("rejected")}
                            >
                                Отклонить
                            </button>
                            <button
                                className="primary-button"
                                type="button"
                                onClick={() => submitVerificationDecision("approved")}
                            >
                                Одобрить
                            </button>
                        </div>
                    </aside>
                </div>
            </Modal>
            )}
        </div>
    );
}


