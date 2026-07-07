import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DashboardFacility,
  EmployeeHomeResponse,
  EmployeeProfileResponse,
  FacilitySpecificationResponse,
  InvitationsResponse
} from '../models/employee-flow.models';

@Injectable({ providedIn: 'root' })
export class EmployeeApiService {
  private readonly baseUrl = 'http://localhost:8080/api';

  constructor(private readonly http: HttpClient) {}

  getDashboardFacilities(employeeId: string): Observable<DashboardFacility[]> {
    return this.http.get<DashboardFacility[]>(`${this.baseUrl}/dashboard`, {
      params: { employeeId }
    });
  }

  getEmployeeHomeSummary(employeeId: string): Observable<EmployeeHomeResponse> {
    return this.http.get<EmployeeHomeResponse>(`${this.baseUrl}/employee/home/${employeeId}`);
  }

  getEmployeeProfile(employeeId: string): Observable<EmployeeProfileResponse> {
    return this.http.get<EmployeeProfileResponse>(`${this.baseUrl}/employee/profile/${employeeId}`);
  }

  getEmployeeInvitations(employeeId: string): Observable<InvitationsResponse> {
    return this.http.get<InvitationsResponse>(`${this.baseUrl}/employee/invitations/${employeeId}`);
  }

  getFacilitySpecification(facilityId: number): Observable<FacilitySpecificationResponse> {
    return this.http.get<FacilitySpecificationResponse>(`${this.baseUrl}/facilities/${facilityId}/specification`);
  }
}
