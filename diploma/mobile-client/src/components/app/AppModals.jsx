import React, { useEffect, useMemo, useState } from "react";
// Импортируем базовые нативные компоненты интерфейса
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import DatePicker from "react-native-date-picker";

function parseDateTime(dateValue, timeValue = "12:00") {
    const today = new Date();
    const [year, month, day] = String(dateValue || "").split("-").map(Number);
    const [hours = 12, minutes = 0] = String(timeValue || "12:00").split(":").map(Number);
    if (!year || !month || !day) {
        today.setHours(hours || 12, minutes || 0, 0, 0);
        return today;
    }
    return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
}

function formatDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatTimeValue(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

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
        //renderChatMessage,
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

    useEffect(() => {
        setSellerReviewsPage(0);
    }, [sellerProfileModal.open, sellerProfileModal.data?.id]);

    const [viewingPicker, setViewingPicker] = useState({ open: false, mode: "date", date: new Date() });
    const openViewingPicker = (mode) => {
        setViewingPicker({
            open: true,
            mode,
            date: parseDateTime(viewingModal.date, viewingModal.time),
        });
    };

    const confirmViewingPicker = (date) => {
        setViewingModal((prev) => ({
            ...prev,
            date: viewingPicker.mode === "date" ? formatDateValue(date) : prev.date,
            time: viewingPicker.mode === "time" ? formatTimeValue(date) : prev.time,
        }));
        setViewingPicker((prev) => ({ ...prev, open: false, date }));
    };

    return (
        <>
            {/* 1. Подключение Telegram */}
            {showTelegramConnect && (
                <Modal onClose={() => {
                    setShowTelegramConnect(false);
                    setTelegramConnectStep("input");
                    setTelegramCode("");
                }}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Подключение Telegram</Text>
                        {telegramConnectStep === "input" ? (
                            <>
                                <Text style={styles.modalText}>Введите ваш username в Telegram (без @):</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="username"
                                    placeholderTextColor="#999"
                                    value={telegramCode}
                                    onChangeText={(text) => setTelegramCode(text)}
                                />
                                <TouchableOpacity
                                    style={[styles.primaryButton, loadingMap['telegram'] && styles.disabledButton]}
                                    onPress={() => {
                                        if (telegramCode.trim() && !loadingMap['telegram']) {
                                            sendTelegramCode(telegramCode);
                                        }
                                    }}
                                    disabled={loadingMap['telegram']}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {loadingMap['telegram'] ? "Отправка..." : "Отправить код подтверждения"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalText}>Введите код, который пришёл в Telegram:</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Код подтверждения"
                                    placeholderTextColor="#999"
                                    value={telegramCode}
                                    onChangeText={(text) => setTelegramCode(text)}
                                />
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => verifyTelegramCode(telegramCode)}
                                >
                                    <Text style={styles.primaryButtonText}>Подтвердить</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Modal>
            )}

            {/* 2. Модалка блокировки пользователя */}
            {blockModal.open && (
                <Modal onClose={() => setBlockModal({ open: false, user: null })}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <View style={styles.headerRow}>
                            <Text style={styles.eyebrow}>Пользователь</Text>
                            <Text style={styles.modalTitle}>
                                {blockModal.user?.blocked ? "Разблокировка пользователя" : "Блокировка пользователя"}
                            </Text>
                        </View>

                        <View style={styles.factsContainer}>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Имя</Text><Text style={styles.factValue}>{blockModal.user?.fullName || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Телефон</Text><Text style={styles.factValue}>{blockModal.user?.phoneNumber || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Гражданство</Text><Text style={styles.factValue}>{blockModal.user?.passportCitizenship || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Паспорт</Text><Text style={styles.factValue}>{blockModal.user?.passportNumber || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Кем выдан</Text><Text style={styles.factValue}>{blockModal.user?.passportIssuedBy || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Дата выдачи</Text><Text style={styles.factValue}>{blockModal.user?.passportIssuedAt || "-"}</Text></View>
                            <View style={[styles.factRow, styles.wideField]}><Text style={styles.factLabel}>Адрес регистрации</Text><Text style={styles.factValue}>{blockModal.user?.passportRegistrationAddress || "-"}</Text></View>
                        </View>

                        {!blockModal.user?.blocked && (
                            <TextInput
                                style={styles.textarea}
                                placeholder="Причина блокировки..."
                                placeholderTextColor="#999"
                                value={blockReason}
                                onChangeText={(text) => setBlockReason(text)}
                                multiline={true}
                                numberOfLines={3}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => setBlockModal({ open: false, user: null })}>
                                <Text style={styles.secondaryButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dangerButton} onPress={() => confirmBlock()}>
                                <Text style={styles.dangerButtonText}>
                                    {blockModal.user?.blocked ? "Разблокировать" : "Заблокировать"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Modal>
            )}

            {/* 3. Модалка верификации пользователя */}
            {verificationModal.open && (
                <Modal onClose={() => setVerificationModal({ open: false, user: null })}>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <View style={styles.headerRow}>
                            <Text style={styles.eyebrow}>Проверка профиля</Text>
                            <Text style={styles.modalTitle}>
                                {verificationModal.user?.verified ? "Снятие верификации" : "Верификация пользователя"}
                            </Text>
                        </View>

                        <View style={styles.factsContainer}>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Имя</Text><Text style={styles.factValue}>{verificationModal.user?.fullName || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Телефон</Text><Text style={styles.factValue}>{verificationModal.user?.phoneNumber || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Гражданство</Text><Text style={styles.factValue}>{verificationModal.user?.passportCitizenship || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Паспорт</Text><Text style={styles.factValue}>{verificationModal.user?.passportNumber || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Кем выдан</Text><Text style={styles.factValue}>{verificationModal.user?.passportIssuedBy || "-"}</Text></View>
                            <View style={styles.factRow}><Text style={styles.factLabel}>Дата выдачи</Text><Text style={styles.factValue}>{verificationModal.user?.passportIssuedAt || "-"}</Text></View>
                            <View style={[styles.factRow, styles.wideField]}><Text style={styles.factLabel}>Адрес регистрации</Text><Text style={styles.factValue}>{verificationModal.user?.passportRegistrationAddress || "-"}</Text></View>
                        </View>

                        {verificationModal.user?.verified && (
                            <>
                                {(verificationModal.user?.role || "").toLowerCase() !== "landlord" ? (
                                    <View style={styles.restrictNote}>
                                        <Text style={styles.restrictNoteText}>Снять верификацию можно только у арендодателей.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.controlsContainer}>
                                        <Text style={styles.fieldLabelText}>Какую верификацию снять</Text>

                                        {/* Нативный Сегмент вместо веб-селекта */}
                                        <View style={styles.segmentedContainer}>
                                            <TouchableOpacity
                                                style={[styles.segmentButton, (verificationModal.verificationType || "owner_verified") === "owner_verified" && styles.segmentActive]}
                                                onPress={() => setVerificationModal(prev => ({ ...prev, verificationType: "owner_verified" }))}
                                            >
                                                <Text style={[styles.segmentText, (verificationModal.verificationType || "owner_verified") === "owner_verified" && styles.segmentTextActive]}>Собственник</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.segmentButton, verificationModal.verificationType === "trusted_partner" && styles.segmentActive]}
                                                onPress={() => setVerificationModal(prev => ({ ...prev, verificationType: "trusted_partner" }))}
                                            >
                                                <Text style={[styles.segmentText, verificationModal.verificationType === "trusted_partner" && styles.segmentTextActive]}>Партнер</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Кастомный Чекбокс */}
                                        {(verificationModal.verificationType || (verificationModal.user?.verificationStatus || "").toLowerCase()) === "trusted_partner" && (
                                            <TouchableOpacity
                                                style={styles.checkboxRow}
                                                onPress={() => setVerificationModal(prev => ({ ...prev, revokeOwnerVerification: !prev.revokeOwnerVerification }))}
                                            >
                                                <View style={[styles.checkbox, verificationModal.revokeOwnerVerification && styles.checkboxChecked]} />
                                                <Text style={styles.checkboxLabel}>Снять также верификацию «Подтвержденный собственник»</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                                <TextInput
                                    style={styles.textarea}
                                    placeholder="Причина снятия верификации..."
                                    placeholderTextColor="#999"
                                    value={verificationReason}
                                    onChangeText={(text) => setVerificationReason(text)}
                                    multiline={true}
                                    numberOfLines={3}
                                />
                            </>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => setVerificationModal({ open: false, user: null })}>
                                <Text style={styles.secondaryButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    (verificationModal.user?.verified && (verificationModal.user?.role || "").toLowerCase() !== "landlord") && styles.disabledButton
                                ]}
                                onPress={() => confirmVerification({
                                    verificationType: verificationModal.verificationType,
                                    revokeOwnerVerification: verificationModal.revokeOwnerVerification
                                })}
                                disabled={verificationModal.user?.verified && (verificationModal.user?.role || "").toLowerCase() !== "landlord"}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {verificationModal.user?.verified ? "Снять верификацию" : "Верифицировать"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Modal>
            )}

            {/* 4. Модалка модерации объявления */}
            {moderationModal.open && (
                <DetailsModal
                    ad={moderationModal.ad}
                    onClose={() => setModerationModal({ open: false, ad: null, step: "view" })}
                    onToggleFavorite={() => { }}
                    isFavorite={false}
                    loading={false}
                    onOpenDialog={() => { }}
                    onOpenOwnerProfile={openSellerProfile}
                    hideActions
                    duplicateWarning={moderationModal.ad?.duplicatePhotoDetected && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningTitle}>В базе есть объявления с идентичными фотографиями.</Text>
                            {(moderationModal.ad?.duplicateAds || []).length ? (
                                <View style={styles.linksContainer}>
                                    {moderationModal.ad.duplicateAds.map((duplicateAd) => (
                                        <TouchableOpacity
                                            style={styles.linkButton}
                                            key={duplicateAd.id}
                                            onPress={async () => {
                                                try {
                                                    const details = await adminApi.adDetails(duplicateAd.id);
                                                    setSelectedAd({ ...duplicateAd, ...details, _viewOnly: true });
                                                } catch (err) {
                                                    setError(err.message);
                                                }
                                            }}
                                        >
                                            <Text style={styles.linkButtonText}>#{duplicateAd.id} · {duplicateAd.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.warningText}>Система отметила совпадения, но связанные объявления не найдены.</Text>
                            )}
                        </View>
                    )}
                    footer={(
                        <View style={styles.footerContainer}>
                            {moderationModal.step === "reject" && (
                                <TextInput
                                    style={styles.textareaCompact}
                                    placeholder="Причина отклонения..."
                                    placeholderTextColor="#999"
                                    value={rejectReason}
                                    onChangeText={(text) => setRejectReason(text)}
                                    multiline={true}
                                    numberOfLines={3}
                                />
                            )}
                            <View style={styles.modalActionsRow}>
                                {moderationModal.step === "view" && (
                                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setModerationModal({ open: false, ad: null, step: "view" })}>
                                        <Text style={styles.secondaryButtonText}>Отмена</Text>
                                    </TouchableOpacity>
                                )}
                                {moderationModal.step === "view" && (
                                    <TouchableOpacity style={styles.dangerButton} onPress={() => setModerationModal(prev => ({ ...prev, step: "reject" }))}>
                                        <Text style={styles.dangerButtonText}>Отклонить</Text>
                                    </TouchableOpacity>
                                )}
                                {moderationModal.step === "reject" && (
                                    <TouchableOpacity style={styles.dangerButton} onPress={() => confirmReject()}>
                                        <Text style={styles.dangerButtonText}>Подтвердить</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.primaryButtonCompact} onPress={() => confirmApprove()}>
                                    <Text style={styles.primaryButtonText}>Одобрить</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* 5. Карточка детального просмотра выбранного объявления */}
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

            {/* 6. Модалка Черновика / Создания объявления */}
            {draftModal.open && (
                <Modal onClose={closeDraftModal} wide>
                    <ScrollView contentContainerStyle={styles.scrollForm}>
                        <View style={styles.titleActionRow}>
                            <Text style={styles.formTitle}>
                                {draftModal.ad ? "Редактирование объявления" : "Новое объявление"}
                            </Text>
                            <TouchableOpacity
                                style={styles.saveFormButton}
                                onPress={handleDraftSubmit}
                                disabled={loadingMap["save-draft"]}
                            >
                                <Text style={styles.saveFormButtonText}>
                                    {loadingMap["save-draft"] ? "..." : "Сохранить"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGrid}>
                            <Field label="Название">
                                <TextInput style={styles.formInput} value={draft.title} onChangeText={(val) => setDraft({ ...draft, title: val })} />
                            </Field>

                            <Field label="Тип жилья">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentedScroll}>
                                    {propertyOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[styles.miniSegment, draft.propertyType === option.value && styles.segmentActive]}
                                            onPress={() => setDraft({ ...draft, propertyType: option.value })}
                                        >
                                            <Text style={[styles.miniSegmentText, draft.propertyType === option.value && styles.segmentTextActive]}>{option.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </Field>

                            <Field label="Тип аренды">
                                <View style={styles.segmentedContainer}>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, draft.rentalType === "long_term" && styles.segmentActive]}
                                        onPress={() => setDraft({ ...draft, rentalType: "long_term" })}
                                    >
                                        <Text style={[styles.segmentText, draft.rentalType === "long_term" && styles.segmentTextActive]}>Долгосрочно</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.segmentButton, draft.rentalType === "short_term" && styles.segmentActive]}
                                        onPress={() => setDraft({ ...draft, rentalType: "short_term" })}
                                    >
                                        <Text style={[styles.segmentText, draft.rentalType === "short_term" && styles.segmentTextActive]}>Посуточно</Text>
                                    </TouchableOpacity>
                                </View>
                            </Field>

                            <Field label="Город">
                                <TextInput style={styles.formInput} value={draft.city} onChangeText={(val) => setDraft({ ...draft, city: val })} />
                            </Field>
                            <Field label="Район">
                                <TextInput style={styles.formInput} value={draft.district} onChangeText={(val) => setDraft({ ...draft, district: val })} />
                            </Field>
                            <Field label="Регион">
                                <TextInput style={styles.formInput} value={draft.region} onChangeText={(val) => setDraft({ ...draft, region: val })} />
                            </Field>

                            <Field label="Адрес">
                                <AddressInput
                                    value={draft.address}
                                    onChange={(val) => setDraft({ ...draft, address: val })}
                                    placeholder="Введите адрес"
                                />
                            </Field>

                            {draft.rentalType === "long_term" ? (
                                <Field label="Цена в месяц">
                                    <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.pricePerMonth || "")} onChangeText={(val) => setDraft({ ...draft, pricePerMonth: val })} />
                                </Field>
                            ) : (
                                <Field label="Цена за сутки">
                                    <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.pricePerDay || "")} onChangeText={(val) => setDraft({ ...draft, pricePerDay: val })} />
                                </Field>
                            )}

                            <Field label="Комнаты">
                                <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.rooms || "")} onChangeText={(val) => setDraft({ ...draft, rooms: val })} />
                            </Field>

                            {draft.rentalType === "short_term" && (
                                <Field label="Макс. гостей">
                                    <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.maxGuests || "")} onChangeText={(val) => setDraft({ ...draft, maxGuests: val })} />
                                </Field>
                            )}

                            <Field label="Площадь">
                                <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.area || "")} onChangeText={(val) => setDraft({ ...draft, area: val })} />
                            </Field>
                            <Field label="Этаж">
                                <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.floor || "")} onChangeText={(val) => setDraft({ ...draft, floor: val })} />
                            </Field>
                            <Field label="Всего этажей">
                                <TextInput style={styles.formInput} keyboardType="numeric" value={String(draft.totalFloors || "")} onChangeText={(val) => setDraft({ ...draft, totalFloors: val })} />
                            </Field>

                            <Field label="Фотографии" wide>
                                <ImageUploader
                                    existingImages={draft.photos || []}
                                    onImagesUploaded={(urls) => setDraft({ ...draft, photos: urls })}
                                />
                            </Field>

                            <Field label="Описание" wide>
                                <TextInput
                                    style={styles.formTextarea}
                                    value={draft.description}
                                    onChangeText={(val) => setDraft({ ...draft, description: val })}
                                    multiline={true}
                                    numberOfLines={6}
                                />
                            </Field>
                        </View>
                    </ScrollView>
                </Modal>
            )}

            {/* 7. Адаптированная модалка предложения просмотра (Полное завершение логики) */}
            {viewingModal.open && (
                <Modal onClose={() => setViewingModal({ open: false, date: "", time: "" })}>
                    <View style={styles.modalContent}>
                        <DatePicker
                            modal
                            open={viewingPicker.open}
                            date={viewingPicker.date}
                            mode={viewingPicker.mode}
                            locale="ru"
                            title={viewingPicker.mode === "date" ? "Дата просмотра" : "Время просмотра"}
                            confirmText="Готово"
                            cancelText="Отмена"
                            onConfirm={confirmViewingPicker}
                            onCancel={() => setViewingPicker((prev) => ({ ...prev, open: false }))}
                        />
                        <Text style={styles.modalTitle}>Предложить просмотр</Text>

                        <Text style={styles.fieldLabelText}>Дата просмотра</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => openViewingPicker("date")}>
                            <Text style={[styles.pickerButtonText, !viewingModal.date && styles.pickerPlaceholder]}>
                                {viewingModal.date || "Выбрать дату"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.fieldLabelText}>Время просмотра</Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={() => openViewingPicker("time")}>
                            <Text style={[styles.pickerButtonText, !viewingModal.time && styles.pickerPlaceholder]}>
                                {viewingModal.time || "Выбрать время"}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => setViewingModal({ open: false, date: "", time: "" })}>
                                <Text style={styles.secondaryButtonText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleProposeViewing}>
                                <Text style={styles.primaryButtonText}>Предложить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </>
    );
}

// Полноценные стили для идеального отображения на экранах iOS и Android
const styles = StyleSheet.create({
    modalContent: {
        flex: 1,
        paddingHorizontal: 2,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111',
        marginBottom: 18,
    },
    modalText: {
        fontSize: 14,
        color: '#444',
        marginBottom: 12,
        lineHeight: 20,
    },
    eyebrow: {
        fontSize: 12,
        textTransform: 'uppercase',
        color: '#888',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerRow: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 16,
        color: '#111',
        marginBottom: 16,
        backgroundColor: '#F7F7FA',
    },
    pickerButton: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        paddingHorizontal: 14,
        justifyContent: 'center',
        backgroundColor: '#F7F7FA',
        marginBottom: 16,
    },
    pickerButtonText: {
        color: '#111',
        fontSize: 16,
        fontWeight: '600',
    },
    pickerPlaceholder: {
        color: '#8E8E93',
        fontWeight: '500',
    },
    textarea: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 14,
        padding: 12,
        fontSize: 16,
        color: '#111',
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#F7F7FA',
        marginBottom: 16,
    },
    textareaCompact: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#111',
        minHeight: 60,
        textAlignVertical: 'top',
        backgroundColor: '#fafafa',
        marginBottom: 12,
        width: '100%',
    },
    factsContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    factRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    wideField: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        borderBottomWidth: 0,
    },
    factLabel: {
        fontSize: 13,
        color: '#777',
    },
    factValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#222',
        marginTop: 2,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        width: '100%',
    },
    primaryButton: {
        backgroundColor: '#007AFF',
        borderRadius: 22,
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonCompact: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#F2F2F7',
        borderRadius: 22,
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        color: '#333',
        fontSize: 15,
        fontWeight: '500',
    },
    dangerButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 22,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dangerButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    restrictNote: {
        backgroundColor: '#FFF3CD',
        padding: 10,
        borderRadius: 6,
        marginBottom: 12,
    },
    restrictNoteText: {
        color: '#856404',
        fontSize: 13,
    },
    controlsContainer: {
        marginBottom: 16,
    },
    fieldLabelText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 6,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 8,
        padding: 3,
        marginBottom: 12,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentActive: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1,
    },
    segmentText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    segmentTextActive: {
        color: '#000',
        fontWeight: '600',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderRadius: 4,
        marginRight: 8,
    },
    checkboxChecked: {
        backgroundColor: '#007AFF',
    },
    checkboxLabel: {
        fontSize: 13,
        color: '#333',
        flex: 1,
    },
    warningBox: {
        backgroundColor: '#FFEEEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#FFD2D2',
    },
    warningTitle: {
        color: '#D8000C',
        fontWeight: '700',
        fontSize: 13,
        marginBottom: 6,
    },
    warningText: {
        color: '#D8000C',
        fontSize: 12,
    },
    linksContainer: {
        marginTop: 6,
        gap: 6,
    },
    linkButton: {
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFD2D2',
    },
    linkButtonText: {
        color: '#D8000C',
        fontSize: 12,
    },
    footerContainer: {
        width: '100%',
        paddingTop: 8,
    },
    scrollForm: {
        padding: 16,
    },
    titleActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
        flex: 1,
    },
    saveFormButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    saveFormButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    formGrid: {
        gap: 14,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        fontSize: 15,
        backgroundColor: '#fff',
    },
    formTextarea: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        fontSize: 15,
        backgroundColor: '#fff',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    segmentedScroll: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    miniSegment: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#e0e0e0',
        marginRight: 8,
    },
    miniSegmentText: {
        fontSize: 13,
        color: '#444',
    },
});
