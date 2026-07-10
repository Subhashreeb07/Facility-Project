package com.example.hy_backend.service;

import com.example.hy_backend.dto.AuthDtos;

public interface AuthService {
    AuthDtos.LoginResponse register(AuthDtos.RegisterRequest request);

    AuthDtos.LoginResponse login(AuthDtos.LoginRequest request);

    void logout(String bearerToken);

    AuthDtos.CurrentUserResponse currentUser(String bearerToken);

    String resolveRole(String bearerToken);
}
