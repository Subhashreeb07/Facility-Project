package com.example.hy_backend.service;

import com.example.hy_backend.dto.EmployeeDtos;

import java.util.List;

public interface EmployeeService {
    List<EmployeeDtos.DashboardFacilityResponse> getDashboardFacilities(String employeeId);

    EmployeeDtos.EmployeeHomeResponse getEmployeeHomeSummary(String employeeId);

    EmployeeDtos.EmployeeProfileResponse getEmployeeProfile(String employeeId);

    EmployeeDtos.InvitationsResponse getEmployeeInvitations(String employeeId);
}
