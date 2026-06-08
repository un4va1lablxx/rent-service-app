import React, { useState } from "react";
// Импортируем базовые компоненты React Native
import {
  Alert,
  Image,
  Modal as NativeModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
// Сохраняем импорт ваших UI-компонентов и форматировщиков
import { compactName, fallbackImage, formatArea, formatPriceWithType, propertyLabel } from "../../shared/formatters";
import { assetUrl } from "../../lib/api";
import { Fact, Icon, Modal } from "../ui";

const EYE_ICON = require("../../../assets/eye.png");
const OWNER_VERIFIED_BADGE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAADvklEQVR4nO2aSWsUURCAa9w9RxQRd68aJRdRXC9xAU9Go4lrJKLBmVc9QvA0B/0D6t2j4EFFIXrIRXLw5NGD2Uy6qhNJIJqECIJLS70eMnbP9Di9zHQLFtRppt+r71W96lf1GuC/eCT/aS3cGloJtUphbJV+JlVSsJcA8gAgMSjOVQXqfrccFHeDYgsUvwGwM5AaUdQDyHZJydTGFuxlLljDagPFI+7/8nVIhRjWRkCe8xjnqKJBUNQByJ2geLjyf3gWkDYkjQGg+EVFA4Ooor6EIagjMkQpHNvraKmdgR6rCZS5DZCbQU3shxy1OrFO1wBpOjYQRVN6X8nYOT4OOToIebNFz62zW5SkkB1dF9+KR9Qeqyk8CNKOxAGwqLmxLeFBDGtP4gC4uId2hgeROE0cgB01rH3hQRSfTE9oUWt4EMM8mzgAFlXx6QgekRSbAggUpa6Q3tDviqkUeeSzfs/U7oXx9YD0NHHD0dczryA7sakKgZ0B5IugeCZ5Y/lvMF8BuVefqF0iRwCpDRpv0C9Q/DrCGAPu4kyqNSmKGg2BnHXCme+FGkMRlRdxSDcbBqHoJ+Toqmf+l8HHqbT5nRL0YwM88QOUdckD0Q6KvgdcjHEovF+RzHtDjJUaxg3RpT0UdCzDvOyfuByvDIdwcS3PfAPDPFUeznqvBF2QQVc/oKJICg4WKk/0AiA/CAShGxYhIFDPeb46RNDyVVJnm73UedDOgOKHFVZvARQf9SzWnYhh2lkdQoxC+hDAxQuQ48OlAQSG7rt+Rz7igeiNCGHrUK4aWkhXQsSrH8wXQN7r9jbfjQyBRfWm71jSr6J53Zj4EyY/udnXU3Go8ku/0vGLNvACIB0qH9hn78ShhnnDPZeQIY/FsEpuGNlzih/VBQK1TgLS6hKIHLx0EzoWl8/r+lo2I/LjOkLY+qBb3tG3M9pVfn3coDBI/XUEmHWa39WadlJQXX5W15WMtkh9unEeqNSNsyUa3QszwUpd74EuPZ64Fg5i0StpAbHOhAdBOpY4AC7qifAg8rZOjUfMA+FBsrwrcQAsas7aHR4kP741cQAs6m1ze3gQY2JN4gBY1Gh38nKKlZ6XXH+ZLfqaQa7FnGvm7nhbqjStU6y+eqPW4v5s1nPr26p63sdL9yO2PUDn6mdoTTD8/N+/nhaRy37nEFfBQB4BxRecPgAN+YDMBTs71VO8RZm0Mr3fpJQ+4RiuXhwlKtLJp/7i5u/VvWQ/cVpH0nIaBaS35R31pEWyWzUAr4i3UveZEyQvvwFe/tNTzJCI2wAAAABJRU5ErkJggg==";
const TRUSTED_PARTNER_BADGE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAYAAADjVADoAAAACXBIWXMAAAsTAAALEwEAmpwYAAERklEQVR4nO2bW4gcVRCGD6sRDepM1WzURSEqXhAVRbwrah6CCCIIXh5EH1SUPIiC4oOgDbtd1ROTKFEk5kHwKcr4Eja7U9W7ykBEELIqooiEjREveMkF1CjrJYmcTpR1dMzk9Onp7pn5oaDp6e6q+rrP6Z5T5xgz1FBDDVVgVeKJsyoSnWkGVSB8DSp9jMoHExP+CJvh1WaQBEJ3gdIvf0M4bMm+mO4w/a4zGutOQOXVKHSgHcIi2w9C4fJWcLzpOzWC40DoYVT+/H8A/NOEdmCTHjBzG5eYUqvROMa2eRB+AZV2dQ2gvbkIfQdCz9eafIUJghFTdFVaQbUm0U2o/BgKvY5Cu12T72y0C4VfQ6FHq026EWbrlfwSnooANbwflNaD0mYQmgPhb/0n3eUTo/QNCG9LYlFab2OzNyVTCNiMbkelvXkl3X3/wntqwrdlAgGa9etR+Pfck+waBv0GOnGtdxAo/E7uyR210dteIVRaQfUI7/6i2n6vHerozPi5BUjKyZYpn+MPxDSfl3dCrmZjH4LQsoAQ/gKV1iWWbA8gCBDehs3g5L982G1Qfm/gQKCGV7b7sfsGDARNd/KFws2BAQExXdcRRMxX9S0IEP4Jld5HpQYoP3Ekf/YYe6w959C5JQcBSrMQ00Vp/cN0/WJQfrOcIIR2+BxuS4b5hD8rIQheazwLhJ8rHwill4xnodKGXEFUZqOzHZrG7lEJx3zFYK/lMvxnYzdeg1CHzlLoEx8wTo3XnILKH7rEsGzq2dP8jkfo0QeRwFD+FLeEp7v6tokkVTBH/4s/49MrCEbs0JczDOHttrbhVg/h7c4QlBa8lwBQaWeKgPY6+xXe4+6X571CsELlrSkC2mpy8AtKLVe/Xl9di56IDcZRqPyye5OkF41vwaHapeuntedzZb/K/w/EG2Nqpb9VmwstTgBjvdN3q1MRyax1BCIWufqsaXZJNUVfdqlyg/NWJk2tH21+LhwvEC9bsdvs7354DQl87gvg+s6IxCL/h3k/wPCitqirfaqvbILTvP9r0PvtbcozSKntOin5pk8lKNeF7U4DoqYHy3dmB2Lz6JFD+uQQQfhibDJaaLIVKmwoPQugV05vZcHywyFaJw0szB2EFQu8W+Gl4y/RKEIe35J1wJ6spregZCCtLPu+k/2VCW0yvNSrhZcWaQUMLOFO/wOQhFFpTIBDPmLw0NhkstcNxuUMQ/sBp4MenQOoX5vmRBUo/1mT8fFMEVZXvyWeOFf2R2TRCV6HQUzmAeMQUUdjLzlP4aVNkQYqBlO4A0AEQetKUQSDRg6j8awZNYQE1vM+USdU4ugGUvvQIYWdplzpV7Ex+u6wgJQQQetVvxSon1ZRWuJTtbLkQJLzZ9JUCWzaM7uzySizedYugg0wqONX2rIBhBpZV2lc/iAdxkO2lGtLIUS5a8am7jEjuRI5nMUfpFbEMNNZTpY/0JN+pqMjpF+fcAAAAASUVORK5CYII=";

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

  return (
      <TouchableOpacity
          style={styles.badgeBase}
          accessibilityLabel={title}
          onPress={() => Alert.alert(isTrusted ? "Надежный партнер" : "Подтвержденный собственник", title)}
      >
        <Image
            source={{ uri: isTrusted ? TRUSTED_PARTNER_BADGE_ICON : OWNER_VERIFIED_BADGE_ICON }}
            style={styles.badgeIcon}
        />
      </TouchableOpacity>
  );
}

function OwnerAvatar({ name, avatarUrl }) {
  const resolvedAvatarUrl = assetUrl(avatarUrl);
  return (
      <View style={[styles.avatarContainer, resolvedAvatarUrl ? styles.avatarHasPhoto : null]}>
        {resolvedAvatarUrl ? (
            <Image source={{ uri: resolvedAvatarUrl }} style={styles.avatarImage} />
        ) : (
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
        )}
      </View>
  );
}

export function ListingCard({ ad, onOpen, onToggleFavorite, isFavorite, loading, showFavoriteButton = true, footer = null, statusBadge = null, mutedMessage = "", disabledOpen = false, mediaMuted = false, className = "" }) {
  const [index, setIndex] = useState(0);
  const photos = (ad.photoUrls?.length ? ad.photoUrls : ad.photos?.length ? ad.photos : [fallbackImage(ad.propertyType)]).map(assetUrl);
  const currentPhoto = photos[index];
  const isFallbackPhoto = currentPhoto?.startsWith("data:image/svg");

  return (
      <View style={styles.card}>
        {/* Слайдер изображений карточки */}
        <View style={[styles.mediaContainer, mediaMuted ? styles.mediaMuted : null]}>
          {React.isValidElement(statusBadge) ? (
              <View style={styles.mediaStatusBadge}>
                {statusBadge}
              </View>
          ) : statusBadge?.label ? (
              <View style={[styles.mediaStatusBadge, styles.statusBadge, statusBadge.style]}>
                <Text style={styles.statusBadgeText}>{statusBadge.label}</Text>
              </View>
          ) : null}
          <TouchableOpacity
              activeOpacity={0.8}
              style={styles.coverButton}
              onPress={() => !disabledOpen && onOpen?.(ad.id)}
              disabled={disabledOpen}
          >
            {isFallbackPhoto ? (
                <View style={styles.coverFallback}>
                  <Text style={styles.coverFallbackIcon}>⌂</Text>
                  <Text style={styles.coverFallbackText}>{propertyLabel(ad.propertyType)}</Text>
                </View>
            ) : (
                <Image style={styles.coverImage} source={{ uri: currentPhoto }} />
            )}
          </TouchableOpacity>

          {photos.length > 1 && (
              <>
                <TouchableOpacity
                    style={[styles.sliderArrow, styles.arrowLeft]}
                    onPress={() => setIndex((p) => (p - 1 + photos.length) % photos.length)}
                >
                  <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sliderArrow, styles.arrowRight]}
                    onPress={() => setIndex((p) => (p + 1) % photos.length)}
                >
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
                <View style={styles.sliderDots}>
                  {photos.map((_, i) => (
                      <TouchableOpacity
                          key={i}
                          style={[styles.dot, i === index ? styles.dotActive : null]}
                          onPress={() => setIndex(i)}
                      />
                  ))}
                </View>
              </>
          )}
        </View>

        {/* Текстовый контент карточки */}
        <View style={styles.contentContainer}>
          <View style={styles.cardHeaderRow}>
            <TouchableOpacity
                style={styles.titlePressable}
                onPress={() => !disabledOpen && onOpen?.(ad.id)}
                disabled={disabledOpen}
            >
              <Text style={styles.kickerText}>{propertyLabel(ad.propertyType)}</Text>
              <Text style={styles.titleText} numberOfLines={2}>{ad.title}</Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              {showFavoriteButton && (
                  <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={async () => await onToggleFavorite?.(ad.id)}
                      disabled={loading}
                  >
                    <Icon name="heart" isActive={isFavorite} />
                  </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.priceText}>
            {formatPriceWithType(ad.rentalType === "short_term" ? ad.pricePerDay : ad.pricePerMonth, ad.rentalType)}
          </Text>
          <Text style={styles.metaText}>
            {ad.city || "—"}{ad.district ? `, ${ad.district}` : ""} • {ad.rooms || "—"} комн.
          </Text>

          {!!mutedMessage && (
              <View style={styles.mutedNoteBox}>
                <Text style={styles.mutedNoteText}>{mutedMessage}</Text>
              </View>
          )}
          {footer && <View style={styles.cardFooter}>{footer}</View>}
        </View>
      </View>
  );
}

export function DetailsModal({ ad, onClose, onToggleFavorite, isFavorite, loading, onOpenDialog, onOpenOwnerProfile, hideActions = false, duplicateWarning = null, footer = null }) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState(null);
  const photos = (ad?.photoUrls?.length ? ad.photoUrls : [fallbackImage(ad?.propertyType || "apartment")]).map(assetUrl);
  const currentPhoto = photos[currentPhotoIndex];
  const fullScreenPhoto = fullScreenPhotoIndex == null ? null : photos[fullScreenPhotoIndex];
  const isFallbackPhoto = currentPhoto?.startsWith("data:image/svg");

  return (
      <Modal onClose={onClose} wide>
        <ScrollView contentContainerStyle={styles.detailsModalScroll}>
          <View style={styles.detailsHeader}>
            <Text style={styles.modalEyebrow}>{propertyLabel(ad?.propertyType)}</Text>
            <Text style={styles.modalMainTitle}>{ad?.title}</Text>
          </View>

          {/* Слайдер детального просмотра */}
          <View style={styles.detailsGalleryContainer}>
            <View style={styles.photoCounterBox}>
              <Text style={styles.photoCounterText}>{currentPhotoIndex + 1} / {photos.length}</Text>
            </View>
            {isFallbackPhoto ? (
                <View style={styles.detailsFallback}>
                  <Text style={styles.coverFallbackIcon}>⌂</Text>
                  <Text style={styles.coverFallbackText}>{propertyLabel(ad?.propertyType)}</Text>
                </View>
            ) : (
                <TouchableOpacity style={styles.detailsMainImageButton} onPress={() => setFullScreenPhotoIndex(currentPhotoIndex)}>
                  <Image source={{ uri: currentPhoto }} style={styles.detailsMainImage} />
                </TouchableOpacity>
            )}

            {photos.length > 1 && (
                <>
                  <TouchableOpacity
                      style={[styles.sliderArrow, styles.arrowLeft]}
                      onPress={() => setCurrentPhotoIndex((p) => (p - 1 + photos.length) % photos.length)}
                  >
                    <Text style={styles.arrowText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[styles.sliderArrow, styles.arrowRight]}
                      onPress={() => setCurrentPhotoIndex((p) => (p + 1) % photos.length)}
                  >
                    <Text style={styles.arrowText}>›</Text>
                  </TouchableOpacity>
                  <View style={styles.sliderDots}>
                    {photos.map((_, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.dot, idx === currentPhotoIndex ? styles.dotActive : null]}
                            onPress={() => setCurrentPhotoIndex(idx)}
                        />
                    ))}
                  </View>
                </>
            )}
          </View>

          {/* Блок автора (Владельца) */}
          {!hideActions && (
              <View style={styles.ownerCard}>
                <View style={styles.ownerIdentityRow}>
                  <OwnerAvatar name={ad?.ownerName || ad?.userFullName || "Владелец"} avatarUrl={ad?.ownerAvatarUrl} />
                  <View style={styles.ownerMetaColumn}>
                    <View style={styles.ownerNameRow}>
                      <Text style={styles.ownerNameText}>{compactName(ad?.ownerName || ad?.userFullName) || "Владелец"}</Text>
                      <VerificationBadge status={ad?.ownerVerificationStatus} />
                    </View>
                    <View style={styles.ratingRow}>
                      <Text style={styles.starText}>★</Text>
                      <Text style={styles.ratingScoreText}>{Number(ad?.ownerRating || 0).toFixed(1)}</Text>
                      <Text style={styles.ratingSeparator}>•</Text>
                      <Text style={styles.ratingCountText}>
                        {`${Number(ad?.ownerReviewsCount || 0)} ${formatReviewWord(ad?.ownerReviewsCount || 0)}`}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.ownerActionsRow}>
                  <TouchableOpacity style={styles.ownerPrimaryBtn} onPress={() => { onOpenDialog(ad); onClose(); }}>
                    <Text style={styles.ownerPrimaryBtnText}>Написать</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ownerSecondaryBtn} onPress={() => { onOpenOwnerProfile?.(ad?.ownerId); onClose(); }}>
                    <Text style={styles.ownerSecondaryBtnText}>Профиль</Text>
                  </TouchableOpacity>
                </View>
              </View>
          )}

          {/* Факты об объекте */}
          <View style={styles.factsGrid}>
            <Fact label="Город" value={ad?.city || "—"} />
            <Fact label="Адрес" value={ad?.address || "—"} />
            <Fact label="Комнаты" value={String(ad?.rooms || "—")} />
            <Fact label="Площадь" value={formatArea(ad?.area)} />
            <Fact label="Этаж" value={ad?.floor ? `${ad?.floor}/${ad?.totalFloors || "?"}` : "—"} />
            {ad?.rentalType === "short_term" && <Fact label="Макс. гостей" value={String(ad?.maxGuests || "—")} />}
          </View>

          {/* Цена и индикатор просмотров */}
          <View style={styles.detailsPriceBox}>
            <Text style={styles.priceText}>
              {formatPriceWithType(ad?.rentalType === "short_term" ? ad?.pricePerDay : ad?.pricePerMonth, ad?.rentalType)}
            </Text>
            <View style={styles.sideToolsRow}>
              <View style={styles.viewsContainer}>
                <Image source={EYE_ICON} style={styles.viewsIcon} />
                <Text style={styles.viewsCountText}>{ad?.viewsCount || 0}</Text>
              </View>
              {!hideActions && (
                  <TouchableOpacity
                      style={[styles.favoriteButton, isFavorite ? styles.favoriteActive : null]}
                      onPress={() => onToggleFavorite(ad?.id)}
                      disabled={loading}
                  >
                    <Icon name="heart" isActive={isFavorite} />
                  </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Описание */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{ad?.description || "Описание пока не заполнено."}</Text>
          </View>

          {duplicateWarning}
          {footer && <View style={styles.modalFooter}>{footer}</View>}
        </ScrollView>
        <NativeModal visible={fullScreenPhotoIndex != null} transparent animationType="fade" onRequestClose={() => setFullScreenPhotoIndex(null)}>
          <View style={styles.fullscreenPhotoBackdrop}>
            <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullScreenPhotoIndex(null)}>
              <Text style={styles.fullscreenCloseText}>×</Text>
            </TouchableOpacity>
            {!!fullScreenPhoto && <Image source={{ uri: fullScreenPhoto }} style={styles.fullscreenPhoto} />}
            {photos.length > 1 && (
              <>
                <TouchableOpacity
                  style={[styles.fullscreenArrow, styles.fullscreenArrowLeft]}
                  onPress={() => setFullScreenPhotoIndex((p) => (p - 1 + photos.length) % photos.length)}
                >
                  <Text style={styles.fullscreenArrowText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fullscreenArrow, styles.fullscreenArrowRight]}
                  onPress={() => setFullScreenPhotoIndex((p) => (p + 1) % photos.length)}
                >
                  <Text style={styles.fullscreenArrowText}>›</Text>
                </TouchableOpacity>
                <View style={styles.fullscreenCounter}>
                  <Text style={styles.fullscreenCounterText}>{fullScreenPhotoIndex + 1} / {photos.length}</Text>
                </View>
              </>
            )}
          </View>
        </NativeModal>
      </Modal>
  );
}

const styles = StyleSheet.create({
  // Общие стили и бэджи
  badgeBase: {
    padding: 0,
    borderRadius: 12,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: { width: 16, height: 16 },

  // Стили Аватара
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarHasPhoto: { backgroundColor: 'transparent' },
  avatarImage: { width: 44, height: 44 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Стили Карточки (ListingCard)
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eaeaea',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mediaContainer: { height: 200, width: '100%', position: 'relative' },
  mediaStatusBadge: { position: 'absolute', top: 10, left: 10, zIndex: 15 },
  mediaMuted: { opacity: 0.45 },
  coverButton: { width: '100%', height: '100%' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackIcon: { fontSize: 42, color: '#C7CBD3', fontWeight: '700', marginBottom: 6 },
  coverFallbackText: { color: '#8E8E93', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  sliderArrow: {
    position: 'absolute',
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  arrowLeft: { left: 10 },
  arrowRight: { right: 10 },
  arrowText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: -2 },
  sliderDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 8 },

  contentContainer: { padding: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titlePressable: { flex: 1, paddingRight: 8 },
  kickerText: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  titleText: { fontSize: 16, fontWeight: '700', color: '#111' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#eee' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  favoriteButton: { padding: 6 },
  priceText: { fontSize: 18, fontWeight: '800', color: '#007AFF', marginVertical: 6 },
  metaText: { fontSize: 13, color: '#666' },
  mutedNoteBox: { backgroundColor: '#f5f5f5', padding: 8, borderRadius: 6, marginTop: 8 },
  mutedNoteText: { fontSize: 12, color: '#666' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },

  // Стили Детальной Модалки (DetailsModal)
  detailsModalScroll: { padding: 16, paddingBottom: 40 },
  detailsHeader: { marginBottom: 14 },
  modalEyebrow: { fontSize: 13, color: '#007AFF', textTransform: 'uppercase', fontWeight: '600' },
  modalMainTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginTop: 2 },
  detailsGalleryContainer: { height: 240, width: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 16 },
  photoCounterBox: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, zIndex: 12 },
  photoCounterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  detailsMainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  detailsMainImageButton: { width: '100%', height: '100%' },
  detailsFallback: { width: '100%', height: '100%', backgroundColor: '#F4F5F8', alignItems: 'center', justifyContent: 'center' },

  ownerCard: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 16 },
  ownerIdentityRow: { flexDirection: 'row', alignItems: 'center' },
  ownerMetaColumn: { marginLeft: 12, flex: 1 },
  ownerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  ownerNameText: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#222' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starText: { color: '#FFD700', fontSize: 14, marginRight: 2 },
  ratingScoreText: { fontSize: 13, fontWeight: '600', color: '#444' },
  ratingSeparator: { marginHorizontal: 4, color: '#888' },
  ratingCountText: { fontSize: 12, color: '#666' },
  ownerActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ownerPrimaryBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  ownerPrimaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ownerSecondaryBtn: { flex: 1, backgroundColor: '#efefef', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  ownerSecondaryBtnText: { color: '#333', fontWeight: '600', fontSize: 14 },

  factsGrid: { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16 },
  detailsPriceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 },
  sideToolsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  viewsIcon: { width: 14, height: 14, marginRight: 4, tintColor: '#666' },
  viewsCountText: { fontSize: 12, color: '#555', fontWeight: '500' },
  descriptionContainer: { backgroundColor: '#fcfcfc', padding: 12, borderRadius: 8 },
  descriptionText: { fontSize: 15, color: '#333', lineHeight: 22 },
  modalFooter: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  fullscreenPhotoBackdrop: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  fullscreenPhoto: { width: '100%', height: '100%', resizeMode: 'contain' },
  fullscreenClose: { position: 'absolute', top: 48, right: 20, zIndex: 5, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  fullscreenCloseText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  fullscreenArrow: { position: 'absolute', top: '48%', zIndex: 5, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  fullscreenArrowLeft: { left: 16 },
  fullscreenArrowRight: { right: 16 },
  fullscreenArrowText: { color: '#fff', fontSize: 34, lineHeight: 38, fontWeight: '700' },
  fullscreenCounter: { position: 'absolute', bottom: 44, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  fullscreenCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' }
});
