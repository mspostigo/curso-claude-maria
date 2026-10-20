import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { TableService } from '../../core/services/table.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { Table } from '../../core/models/table.model'
import { Restaurant } from '../../core/models/restaurant.model'
import { CartStore } from '../../core/store/cart.store'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>{{ restaurant()?.name || 'Elige tu mesa' }}</h1>
        <p>Indica cuántas personas sois y elige una mesa libre</p>
      </div>

      <div class="people card">
        <label for="personas">Número de personas</label>
        <input id="personas" type="number" min="1" step="1" [ngModel]="personas()" (ngModelChange)="onPersonasChange($event)" />
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (tables().length === 0) {
        <div class="empty-state card">
          <p>No hay mesas libres para {{ personas() }} personas</p>
        </div>
      } @else {
        <div class="tables-grid">
          @for (table of tables(); track table.id) {
            <button type="button" class="table-card card" [class.selected]="selected()?.id === table.id" (click)="select(table)">
              <h3>Mesa {{ table.numero }}</h3>
              <p>Capacidad: {{ table.capacidad }}</p>
              @if (table.descripcion) {
                <p class="desc">{{ table.descripcion }}</p>
              }
            </button>
          }
        </div>
      }

      <div class="actions">
        <button class="btn btn-primary" [disabled]="!selected() || submitting()" (click)="continue()">
          {{ submitting() ? 'Reservando mesa...' : 'Continuar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .back-link { color: var(--text-muted); font-size: 13px; }
    .people { display: flex; align-items: center; gap: 16px; padding: 16px 20px; margin-bottom: 20px; }
    .people input { width: 90px; }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .table-card { text-align: left; padding: 16px; cursor: pointer; border: 2px solid transparent; }
    .table-card:hover { border-color: var(--green-medium); }
    .table-card.selected { border-color: var(--green-light); background: var(--green-glow); }
    .table-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .table-card p { color: var(--text-secondary); font-size: 13px; }
    .table-card .desc { color: var(--text-muted); margin-top: 4px; }
    .actions { margin-top: 24px; display: flex; justify-content: flex-end; }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly restaurantService = inject(RestaurantService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly restaurant = signal<Restaurant | null>(null)
  readonly personas = signal(2)
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly loading = signal(true)
  readonly submitting = signal(false)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (r) => this.restaurant.set(r),
      error: () => {}
    })
    // Si volvía de la carta con una mesa ya ocupada, se libera para poder elegir otra
    const current = this.cartStore.table()
    if (current && current.restaurantId === this.restaurantId) {
      this.tableService.release(current.restaurantId, current.id).subscribe({ error: () => {} })
      this.cartStore.clearTable()
    }
    this.loadTables()
  }

  onPersonasChange(value: number | null): void {
    const n = Math.floor(Number(value))
    this.personas.set(Number.isFinite(n) && n >= 1 ? n : 1)
    this.loadTables()
  }

  select(table: Table): void {
    this.selected.set(table)
  }

  private loadTables(): void {
    this.loading.set(true)
    this.selected.set(null)
    this.tableService.getFreeTables(this.restaurantId, this.personas()).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const table = this.selected()
    if (!table) return
    this.submitting.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, table.id, this.personas()).subscribe({
      next: (occupied) => {
        this.cartStore.setTable({
          id: occupied.id,
          restaurantId: this.restaurantId,
          numero: occupied.numero,
          personas: this.personas()
        })
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.submitting.set(false)
        if (err?.status === 409) {
          this.error.set('Esa mesa acaba de ser ocupada. Elige otra.')
          this.loadTables()
        } else if (err?.error?.error === 'TableCapacityExceededError') {
          this.error.set('La mesa no tiene capacidad suficiente.')
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
