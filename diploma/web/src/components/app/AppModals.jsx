import { useEffect, useMemo, useState } from "react";

export function AppModals(props) {
    const {
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
        sellerProfileModal,
        setSellerProfileModal,
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
        handleResetCodeKeyDown,
        handlePasswordResetSubmit,
        handleAuthSubmit,
        handleTelegramAuth,
        handleLogout,
        handlePromoteToLandlord,
        handleToggleFavorite,
        handleSearchSubmit,
        openDialogFromAd,
        openSellerProfile,
        handleSendMessage,
        handleProposeViewing,
        handleViewingDecision,
        handleViewingResult,
        closeContractModal,
        updateContractField,
        handleCreateContract,
        handleSignContract,
        updatePaymentField,
        closePaymentModal,
        handlePaymentSubmit,
        openDraftModal,
        closeDraftModal,
        handleDraftSubmit,
        handleToggleAdActive,
        handleModeration,
        searchUsers,
        searchAds,
        openBlockModal,
        openVerificationModal,
        openModerationModal,
        confirmBlock,
        confirmVerification,
        confirmApprove,
        confirmReject,
        ImageUploader,
        AddressInput,
        adminApi,
        adsApi,
        authApi,
        favoritesApi,
        messagesApi,
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
    } = props;
    const [sellerAdsFilter, setSellerAdsFilter] = useState("active");

    const sellerAds = sellerProfileModal.data?.ads || [];
    const filteredSellerAds = useMemo(() => sellerAds.filter((item) => sellerAdsFilter === "active" ? item.active : !item.active), [sellerAds, sellerAdsFilter]);

    const withRubles = (value) => {
        const normalized = String(value || "").trim();
        if (!normalized) return "";
        return /руб\.?$/i.test(normalized) ? normalized : `${normalized} руб.`;
    };
    const [sellerReviewsPage, setSellerReviewsPage] = useState(0);
    const sellerReviews = sellerProfileModal.data?.reviews || [];
    const sellerReviewsPagesCount = Math.max(1, Math.ceil(sellerReviews.length / 3));
    const pagedSellerReviews = sellerReviews.slice(sellerReviewsPage * 3, (sellerReviewsPage + 1) * 3);
    const sellerNameParts = (sellerProfileModal.data?.fullName || "Пользователь").trim().split(/\s+/).filter(Boolean);
    const sellerNameFirstLine = sellerNameParts.length >= 3 ? sellerNameParts.slice(0, 2).join(" ") : sellerNameParts.join(" ");
    const sellerNameTail = sellerNameParts.length >= 3 ? sellerNameParts.slice(2).join(" ") : "";

    useEffect(() => {
        setSellerReviewsPage(0);
    }, [sellerProfileModal.open, sellerProfileModal.data?.id]);

    return (
        <>
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


                        {/* Модалка блокировки пользователя */}
                        {blockModal.open && (
                            <Modal onClose={() => setBlockModal({open: false, user: null})}>
                                <div className="admin-modal admin-user-review-modal">
                                    <div className="details-title-row details-title-row-aligned">
                                        <div>
                                            <span className="eyebrow">Пользователь</span>
                                            <h2>{blockModal.user?.blocked ? "Разблокировка пользователя" : "Блокировка пользователя"}</h2>
                                        </div>
                                    </div>

                                    <div className="details-facts details-facts-compact admin-user-facts">
                                        <div className="fact"><span>Имя</span><strong>{blockModal.user?.fullName || "-"}</strong></div>
                                        <div className="fact"><span>Телефон</span><strong>{blockModal.user?.phoneNumber || "-"}</strong></div>
                                        <div className="fact"><span>Гражданство</span><strong>{blockModal.user?.passportCitizenship || "-"}</strong></div>
                                        <div className="fact"><span>Паспорт</span><strong>{blockModal.user?.passportNumber || "-"}</strong></div>
                                        <div className="fact"><span>Кем выдан</span><strong>{blockModal.user?.passportIssuedBy || "-"}</strong></div>
                                        <div className="fact"><span>Дата выдачи</span><strong>{blockModal.user?.passportIssuedAt || "-"}</strong></div>
                                        <div className="fact field-wide"><span>Адрес регистрации</span><strong>{blockModal.user?.passportRegistrationAddress || "-"}</strong></div>
                                    </div>

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
                                <div className="admin-modal admin-user-review-modal">
                                    <div className="details-title-row details-title-row-aligned">
                                        <div>
                                            <span className="eyebrow">Проверка профиля</span>
                                            <h2>{verificationModal.user?.verified ? "Снятие верификации" : "Верификация пользователя"}</h2>
                                        </div>
                                    </div>

                                    <div className="details-facts details-facts-compact admin-user-facts">
                                        <div className="fact"><span>Имя</span><strong>{verificationModal.user?.fullName || "-"}</strong></div>
                                        <div className="fact"><span>Телефон</span><strong>{verificationModal.user?.phoneNumber || "-"}</strong></div>
                                        <div className="fact"><span>Гражданство</span><strong>{verificationModal.user?.passportCitizenship || "-"}</strong></div>
                                        <div className="fact"><span>Паспорт</span><strong>{verificationModal.user?.passportNumber || "-"}</strong></div>
                                        <div className="fact"><span>Кем выдан</span><strong>{verificationModal.user?.passportIssuedBy || "-"}</strong></div>
                                        <div className="fact"><span>Дата выдачи</span><strong>{verificationModal.user?.passportIssuedAt || "-"}</strong></div>
                                        <div className="fact field-wide"><span>Адрес регистрации</span><strong>{verificationModal.user?.passportRegistrationAddress || "-"}</strong></div>
                                    </div>

                                    {verificationModal.user?.verified && (
                                        <>
                                        {(verificationModal.user?.role || "").toLowerCase() !== "landlord" ? (
                                            <div className="verification-restrict-note">
                                                Снять верификацию можно только у арендодателей.
                                            </div>
                                        ) : (
                                            <div className="verification-revoke-controls">
                                                <label className="field field-wide">
                                                    <span>Какую верификацию снять</span>
                                                    <select
                                                        value={verificationModal.verificationType || ((verificationModal.user?.verificationStatus || "").toLowerCase() === "trusted_partner" ? "trusted_partner" : "owner_verified")}
                                                        onChange={(e) => setVerificationModal((prev) => ({ ...prev, verificationType: e.target.value }))}
                                                    >
                                                        <option value="owner_verified">Подтвержденный собственник</option>
                                                        <option value="trusted_partner">Надежный партнер</option>
                                                    </select>
                                                </label>
                                                {(verificationModal.verificationType || (verificationModal.user?.verificationStatus || "").toLowerCase()) === "trusted_partner" && (
                                                    <label className="checkbox-row field-wide">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(verificationModal.revokeOwnerVerification)}
                                                            onChange={(e) => setVerificationModal((prev) => ({ ...prev, revokeOwnerVerification: e.target.checked }))}
                                                        />
                                                        <span>Снять также верификацию «Подтвержденный собственник»</span>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        <textarea
                                            className="reason-input"
                                            placeholder="Причина снятия верификации..."
                                            value={verificationReason}
                                            onChange={(e) => setVerificationReason(e.target.value)}
                                            rows={3}
                                        />
                                        </>
                                    )}
                                    <div className="modal-actions">
                                        <button className="secondary-button" onClick={() => setVerificationModal({ open: false, user: null })}>Отмена</button>
                                        <button
                                            className="primary-button"
                                            onClick={() => confirmVerification({
                                                verificationType: verificationModal.verificationType,
                                                revokeOwnerVerification: verificationModal.revokeOwnerVerification
                                            })}
                                            disabled={verificationModal.user?.verified && (verificationModal.user?.role || "").toLowerCase() !== "landlord"}
                                        >
                                            {verificationModal.user?.verified ? "Снять верификацию" : "Верифицировать"}
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        )}

                        {/* Модалка модерации объявления */}
                        {moderationModal.open && (
                            <DetailsModal
                                ad={moderationModal.ad}
                                onClose={() => setModerationModal({ open: false, ad: null, step: "view" })}
                                onToggleFavorite={() => {}}
                                isFavorite={false}
                                loading={false}
                                onOpenDialog={() => {}}
                                onOpenOwnerProfile={openSellerProfile}
                                hideActions
                                duplicateWarning={moderationModal.ad?.duplicatePhotoDetected && (
                                    <div className="duplicate-warning">
                                        <strong>В базе есть объявления с идентичными фотографиями.</strong>
                                        {(moderationModal.ad?.duplicateAds || []).length ? (
                                            <div className="duplicate-list">
                                                {moderationModal.ad.duplicateAds.map((duplicateAd) => (
                                                    <button
                                                        className="duplicate-link"
                                                        type="button"
                                                        key={duplicateAd.id}
                                                        onClick={async () => {
                                                            try {
                                                                const details = await adminApi.adDetails(duplicateAd.id);
                                                                setSelectedAd({ ...duplicateAd, ...details, _viewOnly: true });
                                                            } catch (err) {
                                                                setError(err.message);
                                                            }
                                                        }}
                                                    >
                                                        #{duplicateAd.id} · {duplicateAd.title}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span>Система отметила совпадения, но связанные объявления не найдены.</span>
                                        )}
                                    </div>
                                )}
                                footer={(
                                    <>
                                        {moderationModal.step === "reject" && (
                                            <textarea
                                                className="reason-input moderation-reject-input"
                                                placeholder="Причина отклонения..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                rows={3}
                                            />
                                        )}
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
                                    </>
                                )}
                            />
                        )}

        {selectedAd && (
                        <DetailsModal
                            ad={selectedAd}
                            onClose={() => {
                                setSelectedAdId(null);
                                setSelectedAd(null);
                            }}
                            onToggleFavorite={handleToggleFavorite}
                            isFavorite={favoriteIds.has(selectedAd.id) || favoriteStatusMap[selectedAd.id]}
                            loading={loadingMap[`favorite-${selectedAd.id}`]}
                            onOpenDialog={openDialogFromAd}
                            onOpenOwnerProfile={openSellerProfile}
                            hideActions={selectedAd._viewOnly === true}
                        />
                    )}

                    {draftModal.open && (
                        <Modal onClose={closeDraftModal} wide>
                            <form className="draft-form" onSubmit={handleDraftSubmit}>
                                <div className="section-heading with-action">
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        width: '100%'
                                    }}>
                                        <h1>{draftModal.ad ? "Редактирование объявления" : "Новое объявление"}</h1>
                                        <button type="submit" className="primary-button"
                                                disabled={loadingMap["save-draft"]}>
                                            {loadingMap["save-draft"] ? "Сохраняем..." : "Сохранить"}
                                        </button>
                                    </div>
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

                    {viewingModal.open && (
                        <Modal onClose={() => setViewingModal({ open: false, date: "", time: "" })}>
                            <div className="section-heading">
                                <h2>Согласование даты просмотра</h2>
                                <p>Выберите дату и время встречи по объявлению.</p>
                            </div>
                            <div className="draft-grid">
                                <Field label="Дата">
                                    <input
                                        type="date"
                                        value={viewingModal.date}
                                        onChange={(e) => setViewingModal((current) => ({ ...current, date: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Время">
                                    <input
                                        type="time"
                                        value={viewingModal.time}
                                        onChange={(e) => setViewingModal((current) => ({ ...current, time: e.target.value }))}
                                    />
                                </Field>
                            </div>
                            <div className="actions-row" style={{ marginTop: "1rem" }}>
                                <button className="ghost-button" onClick={() => setViewingModal({ open: false, date: "", time: "" })}>
                                    Отменить
                                </button>
                                <button className="primary-button" onClick={handleProposeViewing} disabled={loadingMap["viewing-propose"]}>
                                    {loadingMap["viewing-propose"] ? "Отправляем..." : "Предложить"}
                                </button>
                            </div>
                        </Modal>
                    )}

                                        {contractModal.open && (
                        <Modal onClose={() => closeContractModal(false)} wide>
                            <div className="contract-modal">
                                <div className="section-heading contract-modal-header">
                                    <div>
                                        <h2>{contractModal.mode === "landlord" ? "Заполнить договор аренды" : "Заполнить и подписать договор аренды"}</h2>
                                        <p>
                                            {contractModal.mode === "landlord"
                                                ? "Проверьте условия аренды, заполните паспортные данные и отправьте документ арендатору."
                                                : "Проверьте условия договора, заполните свои паспортные данные и подтвердите электронную подпись."}
                                        </p>
                                    </div>
                                </div>

                                <div className="contract-modal-shell">
                                    <div className="contract-modal-main">
                                        <div className="contract-summary-grid">
                                            <div className="contract-summary-card glass"><span>Город подписания</span><strong>{contractModal.city || "Не указан"}</strong></div>
                                            <div className="contract-summary-card glass"><span>Дата подписания</span><strong>{contractModal.signingDateText || "По Москве"}</strong></div>
                                            <div className="contract-summary-card glass"><span>Адрес объекта</span><strong>{contractModal.address || "Не указан"}</strong></div>
                                            <div className="contract-summary-card glass"><span>Стоимость аренды</span><strong>{contractModal.priceText || "Не указана"}</strong></div>
                                            <div className="contract-summary-card glass"><span>Площадь</span><strong>{contractModal.areaText || "Не указана"}</strong></div>
                                            {contractModal.rentalType === "short_term" && (
                                                <div className="contract-summary-card glass"><span>Количество человек</span><strong>{contractModal.maxGuestsText || "Не указано"}</strong></div>
                                            )}
                                        </div>

                                        {contractModal.mode === "landlord" ? (
                                            <div className="contract-form-grid">
                                                <Field label="Дата начала аренды"><input type="date" value={contractModal.startDate} onChange={(e) => updateContractField("startDate", e.target.value)} /></Field>
                                                <Field label="Дата окончания аренды"><input type="date" value={contractModal.endDate} onChange={(e) => updateContractField("endDate", e.target.value)} /></Field>
                                                <Field label="Срок аренды"><input value={contractModal.durationText || "Будет рассчитан автоматически"} readOnly /></Field>
                                                <Field label="Залог"><input value={contractModal.deposit} onChange={(e) => updateContractField("deposit", e.target.value)} placeholder="Например, 15000 руб." /></Field>

                                                {contractModal.rentalType === "short_term" ? (
                                                    <>
                                                        <Field label="Время заезда (МСК)"><input type="time" value={contractModal.checkInTime} onChange={(e) => updateContractField("checkInTime", e.target.value)} /></Field>
                                                        <Field label="Время выселения (МСК)"><input type="time" value={contractModal.checkOutTime} onChange={(e) => updateContractField("checkOutTime", e.target.value)} /></Field>
                                                    </>
                                                ) : (
                                                    <div className="contract-inline-note glass field-wide">
                                                        <label className="checkbox-row contract-checkbox-row">
                                                            <input type="checkbox" checked={contractModal.utilitiesIncluded} onChange={(e) => updateContractField("utilitiesIncluded", e.target.checked)} />
                                                            <span>Коммунальные услуги включены в стоимость</span>
                                                        </label>
                                                    </div>
                                                )}

                                                <Field label="Условия аренды" wide>
                                                    <textarea rows="5" value={contractModal.rules} onChange={(e) => updateContractField("rules", e.target.value)} placeholder="Дополнительные условия проживания, передачи ключей и расчётов" />
                                                </Field>
                                            </div>
                                        ) : (
                                            <div className="contract-form-grid">
                                                <div className="contract-readonly-grid field-wide">
                                                    <div className="contract-readonly-item"><span>Дата начала аренды</span><strong>{contractModal.startDate || "Не указана"}</strong></div>
                                                    <div className="contract-readonly-item"><span>Дата окончания аренды</span><strong>{contractModal.endDate || "Не указана"}</strong></div>
                                                    <div className="contract-readonly-item"><span>Срок аренды</span><strong>{contractModal.durationText || "Не указан"}</strong></div>
                                                    <div className="contract-readonly-item"><span>Залог</span><strong>{contractModal.deposit || "Не указан"}</strong></div>
                                                </div>
                                                <Field label="Условия аренды" wide><textarea rows="5" value={contractModal.rules} readOnly /></Field>
                                            </div>
                                        )}
                                    </div>

                                    <aside className="contract-modal-side glass">
                                        <div className="contract-side-block">
                                            <h3>Электронная подпись</h3>
                                        </div>

                                        {contractModal.documentUrl && (
                                            <a className="secondary-button contract-open-button" href={contractModal.documentUrl} target="_blank" rel="noreferrer">Открыть проект договора</a>
                                        )}

                                        <label className="checkbox-row contract-checkbox-row">
                                            <input
                                                type="checkbox"
                                                checked={contractModal.mode === "landlord" ? contractModal.signImmediately : contractModal.signConfirmed}
                                                onChange={(e) => updateContractField(contractModal.mode === "landlord" ? "signImmediately" : "signConfirmed", e.target.checked)}
                                            />
                                            <span>
                                                {contractModal.mode === "landlord"
                                                    ? "Подтверждаю отправку договора арендатору с электронной подписью"
                                                    : "Подтверждаю подписание договора электронной подписью"}
                                            </span>
                                        </label>

                                        <div className="contract-side-meta">
                                            <span>Тип аренды</span>
                                            <strong>{contractModal.rentalType === "short_term" ? "Посуточная" : "Долгосрочная"}</strong>
                                        </div>

                                        <div className="actions-row contract-modal-actions">
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={contractModal.mode === "landlord" ? handleCreateContract : () => handleSignContract(contractModal.contractId)}
                                                disabled={contractModal.mode === "landlord" ? loadingMap["contract-create"] : loadingMap[`contract-sign-${contractModal.contractId}`]}
                                            >
                                                {contractModal.mode === "landlord"
                                                    ? (loadingMap["contract-create"] ? "Формируем..." : "Сформировать документ")
                                                    : (loadingMap[`contract-sign-${contractModal.contractId}`] ? "Подписываем..." : "Подписать договор")}
                                            </button>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </Modal>
                    )}
                    {paymentModal.open && (
                        <Modal onClose={closePaymentModal}>
                            <div className={`payment-modal-shell ${paymentModal.status === "paid" ? "is-success" : ""}`}>
                                {paymentModal.status === "paid" ? (
                                    <>
                                        <div className="section-heading payment-success-heading">
                                            <h2>Оплата прошла успешно</h2>
                                        </div>
                                        <div className="actions-row contract-modal-actions">
                                            {paymentModal.receiptUrl && (
                                                <a className="primary-button" href={paymentModal.receiptUrl} target="_blank" rel="noreferrer">
                                                    Скачать чек
                                                </a>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="section-heading">
                                            <h2>Оплата бронирования</h2>
                                            <p>Проверьте состав платежа и оплатите аренду с карты арендатора. Деньги будут зачислены арендодателю автоматически.</p>
                                        </div>
                                        <div className="payment-receipt glass">
                                            <div className="payment-receipt-line">
                                                <span>Арендодатель</span>
                                                <strong>{paymentModal.landlordName || "Не указан"}</strong>
                                            </div>
                                            <div className="payment-receipt-line">
                                                <span>Счёт зачисления</span>
                                                <strong>{paymentModal.payoutBankName} {paymentModal.payoutAccountNumberMasked}</strong>
                                            </div>
                                            <div className="payment-receipt-line">
                                                <span>Аренда</span>
                                                <strong>{paymentModal.rentLabel}</strong>
                                            </div>
                                            <div className="payment-receipt-line">
                                                <span>Залог</span>
                                                <strong>{withRubles(paymentModal.depositLabel)}</strong>
                                            </div>
                                            <div className="payment-receipt-line total">
                                                <span>Итого к оплате</span>
                                                <strong>{paymentModal.totalLabel}</strong>
                                            </div>
                                        </div>
                                        <div className="contract-form-grid payment-form-grid">
                                            <Field label="Имя держателя карты" wide>
                                                <input
                                                    value={paymentModal.cardholderName}
                                                    onChange={(e) => updatePaymentField("cardholderName", e.target.value)}
                                                    placeholder="IVAN IVANOV"
                                                />
                                            </Field>
                                            <Field label="Номер карты" wide>
                                                <input
                                                    value={paymentModal.cardNumber}
                                                    onChange={(e) => updatePaymentField("cardNumber", e.target.value)}
                                                    placeholder="0000 0000 0000 0000"
                                                />
                                            </Field>
                                            <Field label="Месяц">
                                                <input
                                                    value={paymentModal.expiryMonth}
                                                    onChange={(e) => updatePaymentField("expiryMonth", e.target.value)}
                                                    placeholder="08"
                                                />
                                            </Field>
                                            <Field label="Год">
                                                <input
                                                    value={paymentModal.expiryYear}
                                                    onChange={(e) => updatePaymentField("expiryYear", e.target.value)}
                                                    placeholder="28"
                                                />
                                            </Field>
                                            <Field label="CVV">
                                                <input
                                                    value={paymentModal.cvv}
                                                    onChange={(e) => updatePaymentField("cvv", e.target.value)}
                                                    placeholder="123"
                                                />
                                            </Field>
                                        </div>
                                        <div className="actions-row contract-modal-actions">
                                            <button className="ghost-button" type="button" onClick={closePaymentModal}>
                                                Отменить
                                            </button>
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={handlePaymentSubmit}
                                                disabled={loadingMap["payment-submit"]}
                                            >
                                                {loadingMap["payment-submit"] ? "Оплачиваем..." : "Оплатить"}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Modal>
                    )}
                    {sellerProfileModal?.open && (
                        <Modal onClose={() => setSellerProfileModal({ open: false, data: null, loading: false })}>
                            <div className="seller-profile-modal">
                                {sellerProfileModal.loading ? (
                                    <p>Загрузка профиля...</p>
                                ) : (
                                    <>
                                        <div className="seller-profile-head">
                                            <div className={`seller-profile-avatar ${sellerProfileModal.data?.avatarUrl ? "has-photo" : ""}`}>
                                                {sellerProfileModal.data?.avatarUrl ? (
                                                    <img src={sellerProfileModal.data.avatarUrl} alt={sellerProfileModal.data?.fullName || "Профиль"} />
                                                ) : (
                                                    <span>{(sellerProfileModal.data?.fullName || "П").charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="seller-profile-main">
                                                <h2 className="seller-profile-name">
                                                    <span>{sellerNameFirstLine || "Пользователь"}</span>
                                                    {" "}
                                                    <span className="seller-profile-name-tail">
                                                        {sellerNameTail && <span>{sellerNameTail}</span>}
                                                        <VerificationBadge status={sellerProfileModal.data?.verificationStatus} />
                                                    </span>
                                                </h2>
                                                <p>
                                                    <span className="seller-rating">★ {Number(sellerProfileModal.data?.landlordRating || 0).toFixed(1)}</span>
                                                    <span className="seller-rating-separator">•</span>
                                                    <span className="seller-reviews-muted">{sellerProfileModal.data?.landlordReviewsCount || 0} отзывов</span>
                                                </p>
                                            </div>
                                            <button
                                                className="primary-button"
                                                type="button"
                                                onClick={() => {
                                                    const firstAd = (sellerProfileModal.data?.ads || [])[0];
                                                    if (firstAd) {
                                                        openDialogFromAd(firstAd);
                                                        setSellerProfileModal({ open: false, data: null, loading: false });
                                                    } else {
                                                        setNotice("У продавца нет активных объявлений для переписки.");
                                                    }
                                                }}
                                            >
                                                Написать
                                            </button>
                                        </div>
                                        <div className="seller-profile-section">
                                            <div className="seller-section-heading">
                                                <h3>Отзывы</h3>
                                                {sellerReviews.length > 3 && (
                                                    <div className="seller-review-pagination">
                                                        <button
                                                            className="ghost-button seller-review-arrow"
                                                            type="button"
                                                            onClick={() => setSellerReviewsPage((current) => Math.max(0, current - 1))}
                                                            disabled={sellerReviewsPage === 0}
                                                            aria-label="Предыдущие отзывы"
                                                        >
                                                            ‹
                                                        </button>
                                                        <span>{sellerReviewsPage + 1} из {sellerReviewsPagesCount}</span>
                                                        <button
                                                            className="ghost-button seller-review-arrow"
                                                            type="button"
                                                            onClick={() => setSellerReviewsPage((current) => Math.min(sellerReviewsPagesCount - 1, current + 1))}
                                                            disabled={sellerReviewsPage >= sellerReviewsPagesCount - 1}
                                                            aria-label="Следующие отзывы"
                                                        >
                                                            ›
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="seller-profile-scroll">
                                                {pagedSellerReviews.map((review) => (
                                                    <article key={review.id} className="review-card glass">
                                                        <div className="review-card-top">
                                                            <div className="review-author-block">
                                                                <div className="review-author-avatar">
                                                                    {review.authorAvatarUrl ? <img src={review.authorAvatarUrl} alt={review.authorName || "Пользователь"} /> : <span>{(review.authorName || "П").charAt(0)}</span>}
                                                                </div>
                                                                <strong>{review.authorName || "Пользователь"}</strong>
                                                            </div>
                                                            <span className="review-rating">★ {Number(review.rating || 0).toFixed(1)}</span>
                                                        </div>
                                                        <p>{review.comment || "Без комментария"}</p>
                                                        <small>{review.adTitle || "Объявление"}</small>
                                                    </article>
                                                ))}
                                                {!sellerReviews.length && <div className="empty-inline">Пока нет отзывов.</div>}
                                            </div>
                                        </div>
                                        <div className="seller-profile-section">
                                            <h3>Объявления <span className="seller-count">{sellerAds.length}</span></h3>
                                            <div className="segmented">
                                                <button className={sellerAdsFilter === "active" ? "active" : ""} type="button" onClick={() => setSellerAdsFilter("active")}>Активные</button>
                                                <button className={sellerAdsFilter === "archive" ? "active" : ""} type="button" onClick={() => setSellerAdsFilter("archive")}>В архиве</button>
                                            </div>
                                            <div className="seller-profile-scroll">
                                                {filteredSellerAds.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        className="seller-ad-link"
                                                        onClick={() => {
                                                            setSelectedAdId(item.id);
                                                            setSellerProfileModal({ open: false, data: null, loading: false });
                                                        }}
                                                    >
                                                        {item.title} · {formatPriceWithType(item.rentalType === "short_term" ? item.pricePerDay : item.pricePerMonth, item.rentalType)}
                                                    </button>
                                                ))}
                                                {!filteredSellerAds.length && <div className="empty-inline">Объявлений в этом разделе пока нет.</div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Modal>
                    )}
        </>
    );
}







