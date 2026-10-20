import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Table } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  getFreeTables(restaurantId: string, capacidadMin: number): Observable<Table[]> {
    const params = new HttpParams()
      .set('estado', 'libre')
      .set('capacidadMin', capacidadMin)
      .set('orden', 'capacidad')
    return this.http.get<Table[]>(`${this.apiUrl}/restaurants/${restaurantId}/tables`, { params })
  }

  occupy(restaurantId: string, tableId: string, personas: number): Observable<Table> {
    return this.http.post<Table>(`${this.apiUrl}/restaurants/${restaurantId}/tables/${tableId}/occupy`, { personas })
  }

  release(restaurantId: string, tableId: string): Observable<Table> {
    return this.http.post<Table>(`${this.apiUrl}/restaurants/${restaurantId}/tables/${tableId}/release`, {})
  }
}
