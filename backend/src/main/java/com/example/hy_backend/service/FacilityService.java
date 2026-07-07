package com.example.hy_backend.service;

import com.example.hy_backend.dto.EmployeeDtos;
import com.example.hy_backend.dto.FacilityDtos;

import java.util.List;

public interface FacilityService {
    FacilityDtos.FacilityCreateResponse createFacility(FacilityDtos.FacilityCreateRequest request);

    List<FacilityDtos.FacilitySummaryResponse> getAllFacilities();

    FacilityDtos.FacilityDetailResponse getFacility(Long facilityId);

    FacilityDtos.FacilityDetailResponse updateFacility(Long facilityId, FacilityDtos.FacilityUpdateRequest request);

    void deleteFacility(Long facilityId);

    FacilityDtos.PublishResponse publishFacility(Long facilityId, FacilityDtos.PublishRequest request);

    EmployeeDtos.FacilitySpecificationResponse getFacilitySpecification(Long facilityId);
}
