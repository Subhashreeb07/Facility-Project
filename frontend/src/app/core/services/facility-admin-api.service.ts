import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from './session.service';

export interface FacilityCreateRequest {
  facilityName: string;
  description?: string;
  category?: string;
  icon?: string;
  status: boolean;
}

export interface FacilityUpdateRequest extends FacilityCreateRequest {}

export interface FacilityCreateResponse {
  facilityId: number;
  message: string;
}

export interface FacilitySummaryResponse {
  facilityId: number;
  facilityName: string;
  status: boolean;
}

export interface FacilityDetailResponse {
  facilityId: number;
  facilityName: string;
  description?: string;
  category?: string;
  icon?: string;
  status: boolean;
  published: boolean;
}

export interface PublishResponse {
  facilityId: number;
  message: string;
}

export interface PublishRequest {
  targetLocations: string[];
}

export interface FieldRequest {
  label: string;
  fieldType: string;
  placeholder?: string;
  required: boolean;
  displayOrder: number;
  validationJson?: string;
  defaultValue?: string;
}

export interface FieldIdResponse {
  fieldId: number;
}

export interface FieldDetailResponse {
  fieldId: number;
  label: string;
  fieldType: string;
  placeholder?: string;
  required: boolean;
  displayOrder: number;
  validationJson?: string;
  defaultValue?: string;
  options: string[];
}

export interface RuleRequest {
  bookingDeadline?: string | null;
  bookingStartTime?: string | null;
  reminderTime?: string | null;
  qrRequired?: boolean;
  allowCancellation?: boolean;
  maximumCapacity?: number | null;
  regularCommuteEnabled?: boolean;
}

export interface RuleResponse {
  bookingDeadline?: string | null;
  bookingStartTime?: string | null;
  reminderTime?: string | null;
  qrRequired?: boolean;
  allowCancellation?: boolean;
  maximumCapacity?: number | null;
  regularCommuteEnabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FacilityAdminApiService {
  private readonly baseUrl = 'http://localhost:8080/api';

  constructor(
    private readonly http: HttpClient,
    private readonly sessionService: SessionService
  ) {}

  createFacility(payload: FacilityCreateRequest): Observable<FacilityCreateResponse> {
    return this.http.post<FacilityCreateResponse>(`${this.baseUrl}/facilities`, payload, {
      headers: this.authHeader()
    });
  }

  getFacilities(): Observable<FacilitySummaryResponse[]> {
    return this.http.get<FacilitySummaryResponse[]>(`${this.baseUrl}/facilities`, {
      headers: this.authHeader()
    });
  }

  getFacility(facilityId: number): Observable<FacilityDetailResponse> {
    return this.http.get<FacilityDetailResponse>(`${this.baseUrl}/facilities/${facilityId}`, {
      headers: this.authHeader()
    });
  }

  updateFacility(facilityId: number, payload: FacilityUpdateRequest): Observable<FacilityDetailResponse> {
    return this.http.put<FacilityDetailResponse>(`${this.baseUrl}/facilities/${facilityId}`, payload, {
      headers: this.authHeader()
    });
  }

  deleteFacility(facilityId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/facilities/${facilityId}`, {
      headers: this.authHeader()
    });
  }

  publishFacility(facilityId: number, payload: PublishRequest): Observable<PublishResponse> {
    return this.http.post<PublishResponse>(`${this.baseUrl}/facilities/${facilityId}/publish`, payload, {
      headers: this.authHeader()
    });
  }

  addField(facilityId: number, payload: FieldRequest): Observable<FieldIdResponse> {
    return this.http.post<FieldIdResponse>(`${this.baseUrl}/facilities/${facilityId}/fields`, payload, {
      headers: this.authHeader()
    });
  }

  addFieldOptions(fieldId: number, options: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/fields/${fieldId}/options`, { options }, {
      headers: this.authHeader()
    });
  }

  deleteField(fieldId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/fields/${fieldId}`, {
      headers: this.authHeader()
    });
  }

  updateField(fieldId: number, payload: FieldRequest): Observable<FieldDetailResponse> {
    return this.http.put<FieldDetailResponse>(`${this.baseUrl}/fields/${fieldId}`, payload, {
      headers: this.authHeader()
    });
  }

  saveRules(facilityId: number, payload: RuleRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/facilities/${facilityId}/rules`, payload, {
      headers: this.authHeader()
    });
  }

  getRules(facilityId: number): Observable<RuleResponse> {
    return this.http.get<RuleResponse>(`${this.baseUrl}/facilities/${facilityId}/rules`, {
      headers: this.authHeader()
    });
  }

  private authHeader(): HttpHeaders {
    const token = this.sessionService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
