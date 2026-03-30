import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ThirdParty, ThirdPartyCreate } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ThirdPartyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/third-parties/`;

  list(): Observable<ThirdParty[]> {
    return this.http.get<ThirdParty[]>(this.baseUrl);
  }

  get(id: string): Observable<ThirdParty> {
    return this.http.get<ThirdParty>(`${this.baseUrl}${id}/`);
  }

  create(data: ThirdPartyCreate): Observable<ThirdParty> {
    return this.http.post<ThirdParty>(this.baseUrl, data);
  }

  update(id: string, data: ThirdPartyCreate): Observable<ThirdParty> {
    return this.http.put<ThirdParty>(`${this.baseUrl}${id}/`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }
}
