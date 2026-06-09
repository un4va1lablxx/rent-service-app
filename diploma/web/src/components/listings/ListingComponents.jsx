import { useState } from "react";
import { Fact, Icon, Modal } from "../ui";
import { fallbackImage, formatArea, formatPriceWithType, propertyLabel } from "../../shared/formatters";

const OWNER_VERIFIED_BADGE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAADvklEQVR4nO2aSWsUURCAa9w9RxQRd68aJRdRXC9xAU9Go4lrJKLBmVc9QvA0B/0D6t2j4EFFIXrIRXLw5NGD2Uy6qhNJIJqECIJLS70eMnbP9Di9zHQLFtRppt+r71W96lf1GuC/eCT/aS3cGloJtUphbJV+JlVSsJcA8gAgMSjOVQXqfrccFHeDYgsUvwGwM5AaUdQDyHZJydTGFuxlLljDagPFI+7/8nVIhRjWRkCe8xjnqKJBUNQByJ2geLjyf3gWkDYkjQGg+EVFA4Ooor6EIagjMkQpHNvraKmdgR6rCZS5DZCbQU3shxy1OrFO1wBpOjYQRVN6X8nYOT4OOToIebNFz62zW5SkkB1dF9+KR9Qeqyk8CNKOxAGwqLmxLeFBDGtP4gC4uId2hgeROE0cgB01rH3hQRSfTE9oUWt4EMM8mzgAFlXx6QgekRSbAggUpa6Q3tDviqkUeeSzfs/U7oXx9YD0NHHD0dczryA7sakKgZ0B5IugeCZ5Y/lvMF8BuVefqF0iRwCpDRpv0C9Q/DrCGAPu4kyqNSmKGg2BnHXCme+FGkMRlRdxSDcbBqHoJ+Toqmf+l8HHqbT5nRL0YwM88QOUdckD0Q6KvgdcjHEovF+RzHtDjJUaxg3RpT0UdCzDvOyfuByvDIdwcS3PfAPDPFUeznqvBF2QQVc/oKJICg4WKk/0AiA/CAShGxYhIFDPeb46RNDyVVJnm73UedDOgOKHFVZvARQf9SzWnYhh2lkdQoxC+hDAxQuQ48OlAQSG7rt+Rz7igeiNCGHrUK4aWkhXQsSrH8wXQN7r9jbfjQyBRfWm71jSr6J53Zj4EyY/udnXU3Go8ku/0vGLNvACIB0qH9hn78ShhnnDPZeQIY/FsEpuGNlzih/VBQK1TgLS6hKIHLx0EzoWl8/r+lo2I/LjOkLY+qBb3tG3M9pVfn3coDBI/XUEmHWa39WadlJYKX5W15WMtkh9unEeqNSNsyUa3QszwUpd74EuPZ64Fg5i0StpAbHOhAdBOpY4AC7qifAg8rZOjUfMA+FBsrwrcQAsas7aHR4kP741cQAs6m1ze3gQY2JN4gBY1Gh38nKKlZ6XXH+ZLfqaQa7FnGvm7nhbqjStU6y+eqPW4v5s1nPr26p63sdL9yO2PUDn6mdoTTD8/N+/nhaRy37nEFfBQB4BxRecPgAN+YDMBTs71VO8RZm0Mr3fpJQ+4RiuXhwlKtLJp/7i5u/VvWQ/cVpH0nIaBaS35R31pEWyWzUAr4i3UveZEyQvvwFe/tNTzJCI2wAAAABJRU5ErkJggg==";
const TRUSTED_PARTNER_BADGE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAYAAADjVADoAAAACXBIWXMAAAsTAAALEwEAmpwYAAAERklEQVR4nO2bW4gcVRCGD6sRDepM1WzURSEqXhAVRbwrah6CCCIIXh5EH1SUPIiC4oOgDbtd1ROTKFEk5kHwKcr4Eja7U9W7ykBEELIqooiEjREveMkF1CjrJYmcTpR1dMzk9Onp7pn5oaDp6e6q+rrP6Z5T5xgz1FBDDVVgVeKJsyoSnWkGVSB8DSp9jMoHExP+CJvh1WaQBEJ3gdIvf0M4bMm+mO4w/a4zGutOQOXVKHSgHcIi2w9C4fJWcLzpOzWC40DoYVT+/H8A/NOEdmCTHjBzG5eYUqvROMa2eRB+AZV2dQ2gvbkIfQdCz9eafIUJghFTdFVaQbUm0U2o/BgKvY5Cu12T72y0C4VfQ6FHq026EWbrlfwSnooANbwflNaD0mYQmgPhb/0n3eUTo/QNCG9LYlFab2OzNyVTCNiMbkelvXkl3X3/wntqwrdlAgGa9etR+Pfck+waBv0GOnGtdxAo/E7uyR210dteIVRaQfUI7/6i2n6vHerozPi5BUjKyZYpn+MPxDSfl3dCrmZjH4LQsoAQ/gKV1iWWbA8gCBDehs3g5L982G1Qfm/gQKCGV7b7sfsGDARNd/KFws2BAQExXdcRRMxX9S0IEP4Jld5HpQYoP3Ekf/YYe6w959C5JQcBSrMQ00Vp/cN0/WJQfrOcIIR2+BxuS4b5hD8rIQheazwLhJ8rHwill4xnodKGXEFUZqOzHZrG7lEJx3zFYK/lMvxnYzdeg1CHzlLoEx8wTo3XnILKH7rEsGzq2dP8jkfo0QeRwFD+FLeEp7v6tokkVTBH/4s/49MrCEbs0JczDOHttrbhVg/h7c4QlBa8lwBQaWeKgPY6+xXe4+6X571CsELlrSkC2mpy8AtKLVe/Xl9di56IDcZRqPyye5OkF41vwaHapeudedzZb/K/w/EG2Nqpb9VmwstTgBjvdN3q1MRyax1BCIWufqsaXZJNUVfdqlyg/NWJk2tH21+LhwvEC9bsdvs7354DQl87gvg+s6IxCL/h3k/wPCitqirfaqvbILTvP9r0PvtbcozSKntOin5pk8lKNeF7U4DoqYHy3dmB2Lz6JFD+uQQQfhibDJaaLIVKmwoPQugV05vZcHywyFaJw0szB2EFQu8W+Gl4y/RKEIe35J1wJ6spregZCCtLPu+k/2VCW0yvNSrhZcWaQUMLOFO/wOQhFFpTIBDPmLw0NhkstcNxuUMQ/sBp4MenQOoX5vmRBUo/1mT8fFMEVZXvyWeOFf2R2TRCV6HQUzmAeMQUUdjLzlP4aVNkQYqBlO4A0AEQetKUQSDRg6j8awZNYQE1vM+USdU4ugGUvvQIYWdplzpV7Ex+u6wgJQQQetVvxSon1ZRWuJTtbLkQJLzZ9JUCWzaM7uzyS3Qe4ugh0wqONX2rIBhBpZV2lc/iAdxkO2lGtLIUS5a8am7jEjuRI5nMUfpFbEMNNZTpY/0JN+pqMjpF+fcAAAAASUVORK5CYII=";
const VIEWS_EYE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABU0lEQVR4nO1UsU7DQAyNhBiAgRHxHRR+pTOtupaP6IIUBXL2+XwnVIZ0y9ClCxRWBiZ+CTkhSO1dLmGJGGrJUhTb7/mefZckB/vX5u7dOYEda2Ag4BetzKd49V39s2PJ+TNwWZZHWpmJBv4g4K+YS47kSk0v8Dx/utDIqy5g2idCXkltXJIHd0lgNwGAR6PMVZZlJ+KIdqTB5n6e3QhGGNy5UwKz3i9CpNu2hgh46pOYtWB5yah4Eeo8qcmPCflOK34jMFsDbi7/KhJk5TWleLELjnYU0lVkkbgAejFw84ogp+tQrWD+Ehjg51BSc9S6c0+Kd4mlaXoWHDzaZW8CArMNrOerxIqi6CZok6g5ZkgiDaaSCIBvOiVqG7KsYjPkmkROsjvkn1seH3JsTQl42ramGnjWe02jFw1ZybZIobjIEuo8etEGeSoGeewGea4PNqh9A5YwaO8d5HQ0AAAAAElFTkSuQmCC";

function listingAssetUrl(url) {
  if (!url) return "";
  const value = String(url);
  if (/^(data:|blob:|file:)/i.test(value)) return value;

  const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL?.trim() || window.location.origin, window.location.origin);
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const isUpload = parsed.pathname.startsWith("/uploads/");
      const isLocalHost = ["localhost", "127.0.0.1", "10.0.2.2", "192.168.0.23"].includes(parsed.hostname);
      if (isUpload && (isLocalHost || parsed.origin !== baseUrl.origin)) {
        return `${baseUrl.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  return value.startsWith("/") ? `${baseUrl.origin}${value}` : `${baseUrl.origin}/${value}`;
}

function getInitials(name) {
  if (!name) return "??";
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

function formatReviewWord(count) {
  const n = Math.abs(Number(count) || 0);
  const n100 = n % 100;
  const n10 = n % 10;
  if (n100 >= 11 && n100 <= 14) return "отзывов";
  if (n10 === 1) return "отзыв";
  if (n10 >= 2 && n10 <= 4) return "отзыва";
  return "отзывов";
}

export function VerificationBadge({ status }) {
  const normalizedStatus = (status || "").toLowerCase();
  if (normalizedStatus !== "owner_verified" && normalizedStatus !== "trusted_partner") return null;
  const isTrusted = normalizedStatus === "trusted_partner";
  const title = isTrusted
    ? "Этот пользователь прошел видеособеседование с нашей командой и является надежным партнером"
    : "Этот пользователь подтвердил документы и является собственником жилья";

  return <span className={`verification-badge verification-badge-${isTrusted ? "trusted" : "owner"}`} title={title} aria-label={title}><img src={isTrusted ? TRUSTED_PARTNER_BADGE_ICON : OWNER_VERIFIED_BADGE_ICON} alt="" /></span>;
}

function OwnerAvatar({ name, avatarUrl }) {
  return <div className={`listing-owner-avatar ${avatarUrl ? "has-photo" : ""}`}>{avatarUrl ? <img src={listingAssetUrl(avatarUrl)} alt={name || "Владелец"} /> : <span>{getInitials(name)}</span>}</div>;
}

function OwnerNameWithBadge({ name, status }) {
  const parts = (name || "Владелец").trim().split(/\s+/).filter(Boolean);
  const displayName = parts.join(" ") || "Владелец";

  return (
    <strong className="owner-name-with-badge">
      <span className="owner-name-text">{displayName}</span>
      <VerificationBadge status={status} />
    </strong>
  );
}

export function ListingCard({ ad, onOpen, onToggleFavorite, isFavorite, loading, showFavoriteButton = true, footer = null, statusBadge = null, mutedMessage = "", disabledOpen = false, className = "" }) {
  const [index, setIndex] = useState(0);
  const photos = (ad.photoUrls?.length ? ad.photoUrls : ad.photos?.length ? ad.photos : [ad.primaryPhotoUrl || fallbackImage(ad.propertyType)]).map(listingAssetUrl);
  const cardClassName = `listing-card glass ${mutedMessage ? "is-muted" : ""} ${className}`.trim();

  return (
    <article className={cardClassName}>
      <div className="listing-media">
        <button className="cover-button" type="button" onClick={() => !disabledOpen && onOpen?.(ad.id)} disabled={disabledOpen}><img className="listing-cover" src={photos[index]} alt={ad.title} /></button>
        {photos.length > 1 && <><button className="slider-arrow left" type="button" onClick={() => setIndex((p) => (p - 1 + photos.length) % photos.length)} aria-label="Предыдущее фото">‹</button><button className="slider-arrow right" type="button" onClick={() => setIndex((p) => (p + 1) % photos.length)} aria-label="Следующее фото">›</button><div className="slider-dots">{photos.map((_, i) => <span key={i} className={i === index ? "active" : ""} onClick={() => setIndex(i)} />)}</div></>}
      </div>
      <div className="listing-content">
        <div className="listing-header">
          <button className="listing-title-button" type="button" onClick={() => !disabledOpen && onOpen?.(ad.id)} disabled={disabledOpen}><p className="listing-kicker">{propertyLabel(ad.propertyType)}</p><h3>{ad.title}</h3></button>
          {statusBadge?.label && <span className={`badge ${statusBadge.className || ""}`}>{statusBadge.label}</span>}
          {showFavoriteButton && <button className={`icon-button ${isFavorite ? "active" : ""}`} type="button" onClick={async (e) => { e.stopPropagation(); await onToggleFavorite?.(ad.id); }} disabled={loading} title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}><Icon name="heart" isActive={isFavorite} /></button>}
        </div>
        <p className="listing-price">{formatPriceWithType(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth, ad.rentalType)}</p>
        <p className="listing-meta">{ad.city || "—"}{ad.district ? `, ${ad.district}` : ""} • {ad.rooms || "—"} комн.</p>
        {mutedMessage && <div className="listing-status-note">{mutedMessage}</div>}
        {footer && <div className="listing-card-footer">{footer}</div>}
      </div>
    </article>
  );
}

export function DetailsModal({ ad, onClose, onToggleFavorite, isFavorite, loading, onOpenDialog, onOpenOwnerProfile, hideActions = false, duplicateWarning = null, footer = null }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photos = (ad?.photoUrls?.length ? ad.photoUrls : [fallbackImage(ad?.propertyType || "apartment")]).map(listingAssetUrl);

  return (
    <Modal onClose={onClose} wide>
      <div className="details-layout details-layout-stacked"><div className="details-content">
        <div className="details-title-row details-title-row-aligned"><div><span className="eyebrow">{propertyLabel(ad?.propertyType)}</span><h2>{ad?.title}</h2></div></div>
        <div className="details-overview-row details-overview-row-split">
          <div className="details-gallery"><div className="details-slider-container"><div className="photo-counter">{currentPhotoIndex + 1} / {photos.length}</div><img src={photos[currentPhotoIndex]} alt={ad?.title} className="details-main-image" />{photos.length > 1 && <><button className="slider-arrow left" type="button" onClick={() => setCurrentPhotoIndex((p) => (p - 1 + photos.length) % photos.length)} aria-label="Предыдущее фото">‹</button><button className="slider-arrow right" type="button" onClick={() => setCurrentPhotoIndex((p) => (p + 1) % photos.length)} aria-label="Следующее фото">›</button><div className="slider-dots">{photos.map((_, idx) => <span key={idx} className={idx === currentPhotoIndex ? "active" : ""} onClick={() => setCurrentPhotoIndex(idx)} />)}</div></>}</div></div>
          <div className="details-side-stack">
            {!hideActions && <div className="details-owner-card details-owner-glass glass"><div className="details-owner-bar"><div className="details-owner-identity"><OwnerAvatar name={ad?.ownerName || ad?.userFullName || "Владелец"} avatarUrl={ad?.ownerAvatarUrl} /><div className="details-owner-copy"><div className="details-owner-name-row"><OwnerNameWithBadge name={ad?.ownerName || ad?.userFullName || "Владелец"} status={ad?.ownerVerificationStatus} /></div><div className="details-owner-meta-row"><div className="details-owner-rating-line"><span className="details-owner-rating-star">★</span><span className="details-owner-rating-score">{Number(ad?.ownerRating || 0).toFixed(1)}</span><span className="details-owner-rating-separator">•</span><span className="details-owner-rating-count">{`${Number(ad?.ownerReviewsCount || 0)} ${formatReviewWord(ad?.ownerReviewsCount || 0)}`}</span></div><div className="details-owner-actions"><button className="primary-button details-owner-action-button" type="button" onClick={() => { onOpenDialog(ad); onClose(); }} title="Написать" aria-label="Написать"><Icon name="message" /><span className="details-owner-action-label">Написать</span></button><button className="secondary-button details-owner-action-button" type="button" onClick={() => onOpenOwnerProfile?.(ad?.ownerId)} title="Профиль" aria-label="Профиль"><Icon name="profile" /><span className="details-owner-action-label">Профиль</span></button></div></div></div></div></div></div>}
            <div className="details-facts details-facts-compact"><Fact label="Город" value={ad?.city || "—"} /><Fact label="Адрес" value={ad?.address || "—"} /><Fact label="Комнаты" value={String(ad?.rooms || "—")} /><Fact label="Площадь" value={formatArea(ad?.area)} /><Fact label="Этаж" value={ad?.floor ? `${ad?.floor}/${ad?.totalFloors || "?"}` : "—"} />{ad?.rentalType === "short_term" && <Fact label="Макс. гостей" value={String(ad?.maxGuests || "—")} />}</div>
            <div className="details-price-card"><p className="listing-price">{formatPriceWithType(ad?.rentalType === "short_term" ? ad?.pricePerDay : ad?.pricePerMonth, ad?.rentalType)}</p></div>
            <div className="details-title-tools details-side-tools"><div className="details-views-indicator"><img src={VIEWS_EYE_ICON} alt="" /><span>{ad?.viewsCount || 0}</span></div>{!hideActions && <button className={`icon-button ${isFavorite ? "active" : ""}`} type="button" onClick={() => onToggleFavorite(ad?.id)} disabled={loading} title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}><Icon name="heart" isActive={isFavorite} /></button>}</div>
          </div>
        </div>
        <div className="details-description-card details-description-card-wide details-description-card-aligned"><p className="details-description details-description-body">{ad?.description || "Описание пока не заполнено."}</p></div>
        {duplicateWarning}
        {footer && <div className="modal-actions details-modal-footer">{footer}</div>}
      </div></div>
    </Modal>
  );
}
