package com.example.hy_backend.security;

import com.example.hy_backend.exception.ForbiddenException;
import com.example.hy_backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Locale;

@Component
public class AdminAccessInterceptor implements HandlerInterceptor {

    private final AuthService authService;

    public AdminAccessInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String authorization = request.getHeader("Authorization");
        String role = authService.resolveRole(authorization);

        if (!"ADMIN".equals(role == null ? null : role.toUpperCase(Locale.ROOT))) {
            throw new ForbiddenException("Admin access is required for this endpoint");
        }

        return true;
    }
}
