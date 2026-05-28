export function FavoritesScreen({ favorites, setSelectedTab, loadingMap, setSelectedAdId, favoriteStatusMap, favoriteIds, handleToggleFavorite, ListingCard }) {
  const visibleFavorites = (favorites || []).filter((item) => item?.ad && !item.ad.deleted && (item.ad.moderationStatus || "").toLowerCase() !== "deleted");

  return (
    <section className="stack-section">
      <div className="favorites-header"><h1>Избранное</h1></div>
      {visibleFavorites.length === 0 ? (
        <div className="empty-favorites glass">
          <svg className="empty-illustration" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 50 18.5 37a9.2 9.2 0 0 1 13-13L32 25l.5-1a9.2 9.2 0 1 1 13 13Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>
          <h3>Избранное пока пусто</h3>
          <p>Добавляйте понравившиеся объявления в избранное, чтобы не потерять их.</p>
          <button className="primary-button" onClick={() => setSelectedTab("discover")}>Перейти к объявлениям</button>
        </div>
      ) : (
        <div className="card-grid">
          {visibleFavorites.map((item) => {
            const isUnavailable = !item.ad.active || item.ad.moderationStatus !== "approved";
            return <ListingCard key={item.id} ad={item.ad} onOpen={setSelectedAdId} onToggleFavorite={handleToggleFavorite} isFavorite={favoriteIds.has(item.adId) || favoriteStatusMap[item.adId]} loading={loadingMap[`favorite-${item.adId}`]} mutedMessage={isUnavailable ? "Объявление снято с публикации" : ""} disabledOpen={isUnavailable} />;
          })}
        </div>
      )}
    </section>
  );
}
