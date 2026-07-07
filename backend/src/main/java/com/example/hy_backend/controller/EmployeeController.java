package com.example.hy_backend.controller;

import com.example.hy_backend.dto.EmployeeDtos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.hy_backend.service.EmployeeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Employee", description = "Employee dashboard APIs")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get employee dashboard facilities")
    public ResponseEntity<List<EmployeeDtos.DashboardFacilityResponse>> dashboard(
            @RequestParam(required = false) String employeeId
    ) {
        return ResponseEntity.ok(employeeService.getDashboardFacilities(employeeId));
    }

    @GetMapping("/employee/home/{employeeId}")
    @Operation(summary = "Get employee home summary")
    public ResponseEntity<EmployeeDtos.EmployeeHomeResponse> employeeHome(@PathVariable String employeeId) {
        return ResponseEntity.ok(employeeService.getEmployeeHomeSummary(employeeId));
    }

    @GetMapping("/employee/profile/{employeeId}")
    @Operation(summary = "Get employee profile")
    public ResponseEntity<EmployeeDtos.EmployeeProfileResponse> employeeProfile(@PathVariable String employeeId) {
        return ResponseEntity.ok(employeeService.getEmployeeProfile(employeeId));
    }

    @GetMapping("/employee/invitations/{employeeId}")
    @Operation(summary = "Get employee invitations")
    public ResponseEntity<EmployeeDtos.InvitationsResponse> employeeInvitations(@PathVariable String employeeId) {
        return ResponseEntity.ok(employeeService.getEmployeeInvitations(employeeId));
    }
}
