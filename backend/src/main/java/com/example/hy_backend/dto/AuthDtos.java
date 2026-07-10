package com.example.hy_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank String employeeId, @NotBlank String password) {
    }

        public record RegisterRequest(
            @NotBlank String employeeId,
            @NotBlank String name,
            @NotBlank String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            String department,
            String officeLocation
        ) {
        }

    public record LoginResponse(String token, String employeeId, String name, String email, String role) {
    }

    public record CurrentUserResponse(String employeeId, String name, String email, String role) {
    }
}
