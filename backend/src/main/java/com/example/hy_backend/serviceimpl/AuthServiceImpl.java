package com.example.hy_backend.serviceimpl;

import com.example.hy_backend.dto.AuthDtos;
import com.example.hy_backend.exception.BadRequestException;
import com.example.hy_backend.exception.ResourceNotFoundException;
import com.example.hy_backend.model.Employee;
import com.example.hy_backend.repository.EmployeeRepository;
import com.example.hy_backend.service.AuditService;
import com.example.hy_backend.service.AuthService;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String DEFAULT_PASSWORD = "password123";
    private static final String DEFAULT_LOCATION = "HYDERABAD";
    private static final String DEFAULT_DEPARTMENT = "Workplace Operations";

    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;
    private final Map<String, String> tokenStore = new ConcurrentHashMap<>();

    public AuthServiceImpl(EmployeeRepository employeeRepository, AuditService auditService) {
        this.employeeRepository = employeeRepository;
        this.auditService = auditService;
    }

    @Override
    public AuthDtos.LoginResponse register(AuthDtos.RegisterRequest request) {
        String employeeId = normalizeEmployeeId(request.employeeId());
        String email = normalizeEmail(request.email());
        String password = request.password() == null ? "" : request.password().trim();

        if (password.length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters");
        }

        if (employeeRepository.existsById(employeeId)) {
            throw new BadRequestException("Employee ID already exists: " + employeeId);
        }
        if (employeeRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Email already exists: " + email);
        }

        Employee employee = new Employee();
        employee.setEmployeeId(employeeId);
        employee.setFullName(normalizeName(request.name()));
        employee.setEmail(email);
        employee.setRoleCode("EMPLOYEE");
        employee.setDepartment(normalizeDepartment(request.department()));
        employee.setOfficeLocation(normalizeOfficeLocation(request.officeLocation()));
        employee.setWorkMode("HYBRID");
        employee.setActive(true);
        employee.setPasswordHash(hashPassword(password));

        Employee saved = employeeRepository.save(employee);

        auditService.logAction(
                saved.getEmployeeId(),
                saved.getRoleCode(),
                "AUTH_REGISTER",
                "Employee",
                saved.getEmployeeId(),
                null,
                "{\"register\":\"SUCCESS\"}",
                null
        );

        return createSessionResponse(saved);
    }

    @Override
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        String employeeId = normalizeEmployeeId(request.employeeId());
        Employee profile = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new BadRequestException("Invalid employee ID or password"));

        if (!Boolean.TRUE.equals(profile.getActive()) || !matchesPassword(profile, request.password())) {
            throw new BadRequestException("Invalid employee ID or password");
        }

        auditService.logAction(
                profile.getEmployeeId(),
                profile.getRoleCode(),
                "AUTH_LOGIN",
                "Employee",
                profile.getEmployeeId(),
                null,
                "{\"login\":\"SUCCESS\"}",
                null
        );

            return createSessionResponse(profile);
    }

    @Override
    public void logout(String bearerToken) {
        String token = extractToken(bearerToken);
        String employeeId = tokenStore.remove(token);
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            auditService.logAction(
                    employeeId,
                    employee == null ? "UNKNOWN" : employee.getRoleCode(),
                    "AUTH_LOGOUT",
                    "Employee",
                    employeeId,
                    null,
                    "{\"logout\":\"SUCCESS\"}",
                    null
            );
        }
    }

    @Override
    public AuthDtos.CurrentUserResponse currentUser(String bearerToken) {
        String token = extractToken(bearerToken);
        String employeeId = tokenStore.get(token);
        if (employeeId == null) {
            throw new ResourceNotFoundException("Session not found. Please login again.");
        }

        Employee profile = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));

        return new AuthDtos.CurrentUserResponse(
            profile.getEmployeeId(),
            profile.getFullName(),
            profile.getEmail(),
            profile.getRoleCode().toUpperCase(Locale.ROOT)
        );
    }

    @Override
    public String resolveRole(String bearerToken) {
        return currentUser(bearerToken).role();
    }

    private String extractToken(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) {
            throw new BadRequestException("Authorization token is required");
        }

        if (!bearerToken.startsWith("Bearer ")) {
            throw new BadRequestException("Authorization header must be in format: Bearer <token>");
        }

        String token = bearerToken.substring(7).trim();
        if (token.isBlank()) {
            throw new BadRequestException("Authorization token is required");
        }
        return token;
    }

    private AuthDtos.LoginResponse createSessionResponse(Employee employee) {
        String token = UUID.randomUUID().toString();
        tokenStore.put(token, employee.getEmployeeId());
        return new AuthDtos.LoginResponse(
                token,
                employee.getEmployeeId(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getRoleCode()
        );
    }

    private boolean matchesPassword(Employee employee, String rawPassword) {
        String candidate = rawPassword == null ? "" : rawPassword.trim();
        String storedHash = employee.getPasswordHash();

        if (storedHash == null || storedHash.isBlank()) {
            // Backward compatibility for legacy seeded records.
            return DEFAULT_PASSWORD.equals(candidate);
        }

        return storedHash.equals(hashPassword(candidate));
    }

    private String hashPassword(String rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }

    private String normalizeEmployeeId(String employeeId) {
        if (employeeId == null || employeeId.isBlank()) {
            throw new BadRequestException("employeeId is required");
        }
        return employeeId.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("email is required");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new BadRequestException("name is required");
        }
        return name.trim();
    }

    private String normalizeDepartment(String department) {
        if (department == null || department.isBlank()) {
            return DEFAULT_DEPARTMENT;
        }
        return department.trim();
    }

    private String normalizeOfficeLocation(String location) {
        if (location == null || location.isBlank()) {
            return DEFAULT_LOCATION;
        }
        String canonical = location.trim().toUpperCase(Locale.ROOT);
        if (!"HYDERABAD".equals(canonical) && !"KOLKATA".equals(canonical)) {
            throw new BadRequestException("officeLocation must be HYDERABAD or KOLKATA");
        }
        return canonical;
    }
}
