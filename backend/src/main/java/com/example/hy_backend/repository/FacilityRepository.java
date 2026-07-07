package com.example.hy_backend.repository;

import com.example.hy_backend.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FacilityRepository extends JpaRepository<Facility, Long> {
    boolean existsByFacilityNameIgnoreCase(String facilityName);

    boolean existsByFacilityNameIgnoreCaseAndFacilityIdNot(String facilityName, Long facilityId);

    List<Facility> findByPublishedTrueAndStatusTrue();

    long countByStatusTrue();

    long countByPublishedTrue();
}
