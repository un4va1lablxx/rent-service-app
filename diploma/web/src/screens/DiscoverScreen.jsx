export function DiscoverScreen(props) {
  const {
    cityFilter, setCityFilter, roomsFilter, setRoomsFilter, propertyFilter, setPropertyFilter,
    priceMin, setPriceMin, priceMax, setPriceMax, maxGuestsCount, setMaxGuestsCount,
    checkInDate, setCheckInDate, checkOutDate, setCheckOutDate, searchRentalType, setSearchRentalType,
    discoverSort, setDiscoverSort, curatedAds, favoriteIds, favoriteStatusMap, loadingMap,
    propertyOptions, ListingCard, handleSearchSubmit, handleToggleFavorite, setSelectedAdId
  } = props;

  return (
    <div className="discover-page">
      <section className={`discover-layout ${searchRentalType === "short_term" ? "short-term" : ""}`}>
        <aside className={`filter-panel glass ${searchRentalType === "short_term" ? "short-term" : ""}`}>
          <div className="rental-type-switch"><button className={`switch-btn ${searchRentalType === "long_term" ? "active" : ""}`} type="button" onClick={() => setSearchRentalType("long_term")}>Длительная</button><button className={`switch-btn ${searchRentalType === "short_term" ? "active" : ""}`} type="button" onClick={() => setSearchRentalType("short_term")}>Посуточная</button></div>
          <form className="filter-form" onSubmit={handleSearchSubmit}>
            <label className="field"><span>Город</span><input placeholder="Введите город" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} /></label>
            {searchRentalType === "long_term" ? <label className="field"><span>Комнаты</span><select value={roomsFilter} onChange={(e) => setRoomsFilter(e.target.value)}><option value="">Любые</option><option value="1">1 комната</option><option value="2">2 комнаты</option><option value="3">3 комнаты</option><option value="4">4+ комнаты</option></select></label> : <label className="field"><span>Количество гостей</span><input type="number" placeholder="Например, 2" value={maxGuestsCount} onChange={(e) => setMaxGuestsCount(Number(e.target.value))} min="1" /></label>}
            <div className="filter-inline-grid"><label className="field"><span>Цена от</span><input type="number" placeholder={searchRentalType === "short_term" ? "от ₽/сутки" : "от ₽"} value={priceMin} onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))} min="0" /></label><label className="field"><span>Цена до</span><input type="number" placeholder={searchRentalType === "short_term" ? "до ₽/сутки" : "до ₽"} value={priceMax} onChange={(e) => setPriceMax(Math.max(0, Number(e.target.value)))} min="0" /></label></div>
            {searchRentalType === "short_term" && <label className="field"><span>Даты проживания</span><div className="date-range"><input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} /><span>→</span><input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} /></div></label>}
            <button type="submit" className="primary-button filter-submit">Показать объявления</button>
          </form>
          <div className="filter-tags"><span className="filter-tags-label">Тип жилья</span><div className="segmented filter-segmented"><button className={!propertyFilter ? "active" : ""} type="button" onClick={() => setPropertyFilter("")}>Все</button>{propertyOptions.map((option) => <button key={option.value} className={propertyFilter === option.value ? "active" : ""} type="button" onClick={() => setPropertyFilter(option.value)}>{option.label}</button>)}</div></div>
        </aside>

        <section className="results-panel">
          <div className="results-topbar"><h2 className="results-count">Найдено {curatedAds.length} объявлений</h2><label className="results-sort"><span>Сортировка</span><select value={discoverSort} onChange={(e) => setDiscoverSort(e.target.value)}><option value="rating_desc">По рейтингу арендодателя</option><option value="recent">Сначала новые</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option></select></label></div>
          <section className="card-grid discover-grid">{curatedAds.map((ad) => <ListingCard key={ad.id} ad={ad} onOpen={setSelectedAdId} onToggleFavorite={handleToggleFavorite} isFavorite={favoriteIds.has(ad.id) || favoriteStatusMap[ad.id]} loading={loadingMap[`favorite-${ad.id}`]} />)}</section>
          {!curatedAds.length && <section className="empty-state glass"><h3>Подходящих объявлений пока нет</h3><p>Попробуйте изменить фильтры или расширить диапазон цены и дат.</p></section>}
        </section>
      </section>
    </div>
  );
}
