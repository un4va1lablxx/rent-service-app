import { useMemo, useState } from "react";

const STATUS_META = {
  active: { label: "Активно", className: "success" },
  inactive: { label: "Снято", className: "removed" },
  pending: { label: "На модерации", className: "warning" },
  rejected: { label: "Отклонено", className: "danger" },
  approved: { label: "Одобрено", className: "success" }
};

function isDeletedAd(ad) {
  return Boolean(ad?.deleted) || (ad?.moderationStatus || "").toLowerCase() === "deleted";
}

function resolveAdStatus(ad) {
  if (isDeletedAd(ad)) return { label: "Удалено", className: "danger" };
  if (!ad.active) return STATUS_META.inactive;
  const moderationStatus = (ad.moderationStatus || "").toLowerCase();
  return STATUS_META[moderationStatus] || STATUS_META.active;
}

export function ManageScreen({ myAds, openDraftModal, adsApi, handleToggleAdActive, handleDeleteAd, loadingMap, ListingCard }) {
  const [mode, setMode] = useState("active");
  const filteredAds = useMemo(() => (myAds || []).filter((ad) => {
    if (isDeletedAd(ad)) return mode === "archive";
    return mode === "active" ? ad.active : !ad.active;
  }), [myAds, mode]);

  return (
    <section className="stack-section">
      <div className="manage-header"><h1>Мои объявления</h1><button className="primary-button" onClick={() => openDraftModal()}>+ Новое объявление</button></div>
      <div className="segmented"><button className={mode === "active" ? "active" : ""} type="button" onClick={() => setMode("active")}>Активные</button><button className={mode === "archive" ? "active" : ""} type="button" onClick={() => setMode("archive")}>В архиве</button></div>
      <div className="manage-grid">
        {filteredAds.length === 0 && (
          <div className="empty-state glass manage-empty-state">
            <h3>{mode === "active" ? "У вас пока нет активных объявлений" : "В архиве пока нет объявлений"}</h3>
            <p>{mode === "active" ? "Добавьте первое объявление, чтобы арендаторы могли вас найти." : "Снятые с публикации и занятые объявления будут отображаться здесь."}</p>
          </div>
        )}
        {filteredAds.map((ad) => {
          const status = resolveAdStatus(ad);
          const deleted = isDeletedAd(ad);
          const displayAd = deleted ? { ...ad, title: "Объявление удалено", city: "", district: "", rooms: "", pricePerDay: 0, pricePerMonth: 0, photoUrls: [] } : ad;

          return (
            <ListingCard
              key={ad.id}
              ad={displayAd}
              disabledOpen={deleted}
              mutedMessage={deleted ? "Объявление скрыто во всех разделах." : ""}
              showFavoriteButton={false}
              statusBadge={status}
              footer={(
                <div className="ad-manage-actions">
                  {!deleted && (
                    <>
                      <button className="ghost-button ad-action-toggle" onClick={() => handleToggleAdActive(ad)}>
                        {ad.active ? "Снять" : "Вернуть"}
                      </button>
                      <button
                        className="secondary-button ad-action-edit"
                        onClick={async () => {
                          const details = await adsApi.details(ad.id);
                          openDraftModal(details);
                        }}
                      >
                        Изменить
                      </button>
                      <button className="danger-button ad-action-delete" onClick={() => handleDeleteAd(ad.id)} disabled={loadingMap[`delete-ad-${ad.id}`]}>
                        {loadingMap[`delete-ad-${ad.id}`] ? "Удаляем..." : "Удалить"}
                      </button>
                    </>
                  )}
                </div>
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
