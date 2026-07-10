package com.example.hy_backend.controller;

import com.example.hy_backend.dto.AuthDtos;
import com.example.hy_backend.dto.CommonDtos;
import com.example.hy_backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Employee login/logout/current user APIs")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register employee for first-time sign in")
    public ResponseEntity<AuthDtos.LoginResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login employee")
    public ResponseEntity<AuthDtos.LoginResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout employee")
    public ResponseEntity<CommonDtos.MessageResponse> logout(
            @RequestHeader("Authorization") String authorization
    ) {
        authService.logout(authorization);
        return ResponseEntity.ok(new CommonDtos.MessageResponse("Logged out successfully"));
    }

    @GetMapping("/current-user")
    @Operation(summary = "Get current employee profile")
    public ResponseEntity<AuthDtos.CurrentUserResponse> currentUser(
            @RequestHeader("Authorization") String authorization
    ) {
        return ResponseEntity.ok(authService.currentUser(authorization));
    }
}
