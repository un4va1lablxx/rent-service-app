package edu.belsu.rent_service.adapters.out.persistence.repository;

import edu.belsu.rent_service.domain.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {
    List<Photo> findByAdIdOrderBySortOrderAsc(Long adId);
    void deleteByAdId(Long adId);
    boolean existsByPhotoHash(String photoHash);
    Optional<Photo> findByAdIdAndPrimaryPhotoTrue(Long adId);
    List<Photo> findByPhotoHash(String photoHash);
}
