package com.example.hy_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class FacilityDtos {

    private FacilityDtos() {
    }

    public record FacilityCreateRequest(
            @NotBlank String facilityName,
            String description,
            String category,
            String icon,
            @NotNull Boolean status
    ) {
    }

    public record FacilityUpdateRequest(
            @NotBlank String facilityName,
            String description,
            String category,
            String icon,
            @NotNull Boolean status
    ) {
    }

    public record FacilityCreateResponse(Long facilityId, String message) {
    }

    public record FacilitySummaryResponse(Long facilityId, String facilityName, Boolean status) {
    }

    public record FacilityDetailResponse(
            Long facilityId,
            String facilityName,
            String description,
            String category,
            String icon,
            Boolean status,
            Boolean published,
            List<String> targetLocations
    ) {
    }

    public record PublishRequest(List<String> targetLocations) {
    }

    public record PublishResponse(Long facilityId, String message) {
    }
}
