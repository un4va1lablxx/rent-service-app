export function AuthScreen(props) {
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
        handleSendMessage,
        handleProposeViewing,
        handleViewingDecision,
        handleViewingResult,
        handleCreateContract,
        handleSignContract,
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

    return (
        <div className="auth-shell">
                        <div className="auth-backdrop" />
                        <div className="auth-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <section className="auth-card glass" style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
                                {authView === "form" && (
                                    <>
                                        <div style={{ textAlign: 'center' }}>
                                            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>
                                                {authMode === "login" ? "Вход в систему" : "Регистрация"}
                                            </h2>
                                        </div>
        
                                        {telegramAuth ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
                                                    Для завершения {authMode === "register" ? "регистрации" : "входа"} перейдите в Telegram-бота
                                                </p>
                                                <img
                                                    src={telegramAuth.qrCodeUrl}
                                                    alt="QR для перехода в Telegram"
                                                    width="180"
                                                    height="180"
                                                    style={{ borderRadius: 0, display: 'block', margin: '0 auto 1rem' }}
                                                />
                                                <div style={{ textAlign: 'center' }}>
                                                    <a
                                                        className="primary-button"
                                                        href={telegramAuth.botLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ display: 'inline-block', textDecoration: 'none' }}
                                                    >
                                                        Перейти в бота
                                                    </a>
                                                </div>
                                                <div style={{ marginTop: '1rem' }}>
                                                    <button
                                                        onClick={() => setTelegramAuth(null)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                                                    >
                                                        ← Назад
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
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
                                                    <span>Пароль</span>
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="Минимум 6 символов"
                                                    />
                                                </div>
        
                                                {authMode === "login" && (
                                                    <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
                                                        <button
                                                            type="button"
                                                            onClick={handleForgotPassword}
                                                            disabled={loadingMap["forgot-send"]}
                                                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit', fontSize: '0.875rem' }}
                                                        >
                                                            {loadingMap["forgot-send"] ? "Отправляем код..." : "Забыли пароль?"}
                                                        </button>
                                                    </div>
                                                )}
        
                                                {error && <div className="error-box">{error}</div>}
                                                {notice && <div className="notice">{notice}</div>}
        
                                                <button type="submit" className="primary-button" disabled={loadingMap.auth}>
                                                    {loadingMap.auth ? "Подождите..." : authMode === "register" ? "Создать аккаунт" : "Войти"}
                                                </button>

                                                <div style={{ textAlign: 'center', marginTop: '-0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                                                    {authMode === "login" ? (
                                                        <>
                                                            Нет аккаунта?{" "}
                                                            <button
                                                                onClick={() => { setAuthMode("register"); setError(""); setNotice(""); setPassword(""); setTelegramAuth(null); }}
                                                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                                            >
                                                                Зарегистрироваться
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            Уже есть аккаунт?{" "}
                                                            <button
                                                                onClick={() => { setAuthMode("login"); setError(""); setNotice(""); setPassword(""); setTelegramAuth(null); }}
                                                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                                            >
                                                                Войти
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                                                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                                                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>или</span>
                                                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                                                </div>
        
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        disabled={loadingMap["telegram-auth"]}
                                                        onClick={handleTelegramAuth}
                                                        title={authMode === "register" ? "Создать через Telegram" : "Войти через Telegram"}
                                                        style={{
                                                            width: '52px',
                                                            height: '52px',
                                                            borderRadius: '50%',
                                                            background: '#29b6f6',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 2px 12px rgba(41,182,246,0.4)',
                                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                                            opacity: loadingMap["telegram-auth"] ? 0.6 : 1,
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(41,182,246,0.55)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(41,182,246,0.4)'; }}
                                                    >
                                                        <img src="/telegram.png" alt="Telegram" width="26" height="26" />
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                )}
                                {authView === "reset" && (
                                    <form className="auth-form" onSubmit={handlePasswordResetSubmit}>
                                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
                                                Установка нового пароля
                                            </h2>
                                            <p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
                                                Введите код подтверждения, отправленный в Telegram-бота
                                            </p>
                                        </div>
        
                                        <div className="reset-code-row" aria-label="Код подтверждения">
                                            {resetCode.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    id={`reset-code-${index}`}
                                                    className="reset-code-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength="1"
                                                    value={digit}
                                                    onChange={(e) => handleResetCodeChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleResetCodeKeyDown(index, e)}
                                                />
                                            ))}
                                        </div>
        
                                        <div className="field">
                                            <span>Новый пароль</span>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Минимум 6 символов"
                                            />
                                        </div>
        
                                        {error && <div className="error-box">{error}</div>}
                                        {notice && <div className="notice">{notice}</div>}
        
                                        <button type="submit" className="primary-button" disabled={loadingMap["forgot-confirm"]}>
                                            {loadingMap["forgot-confirm"] ? "Сохраняем..." : "Сохранить пароль"}
                                        </button>
                                        <button
                                            type="button"
                                            className="ghost-button"
                                            onClick={() => {
                                                setAuthView("form");
                                                setError("");
                                                setNotice("");
                                                setResetCode(["", "", "", "", "", ""]);
                                                setNewPassword("");
                                            }}
                                        >
                                            Назад ко входу
                                        </button>
                                    </form>
                                )}
                            </section>
                        </div>
                    </div>
    );
}
