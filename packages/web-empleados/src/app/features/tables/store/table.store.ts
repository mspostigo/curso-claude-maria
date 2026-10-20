import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Table, TableOrder, TableStatus } from '../models/table.model';
import { TableService } from '../services/table.service';

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService);

  private readonly _tables = signal<Table[]>([]);
  private readonly _ordersByTable = signal<Record<string, TableOrder[]>>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  readonly tables = this._tables.asReadonly();
  readonly ordersByTable = this._ordersByTable.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private errorMessage(err: any, fallback: string): string {
    return err?.error?.message || err?.message || fallback;
  }

  async loadTables(restaurantId: string): Promise<void> {
    this._loading.set(true);
    try {
      const tables = await firstValueFrom(this.tableService.getTables(restaurantId));
      this._tables.set(tables);
      this._error.set(null);
      await this.loadOrdersForOccupied(restaurantId, tables);
    } catch (err: any) {
      this._error.set(this.errorMessage(err, 'Error al cargar mesas'));
    } finally {
      this._loading.set(false);
    }
  }

  private async loadOrdersForOccupied(restaurantId: string, tables: Table[]): Promise<void> {
    const occupied = tables.filter(t => t.estado === 'ocupada');
    const entries = await Promise.all(
      occupied.map(async t => {
        try {
          const orders = await firstValueFrom(this.tableService.getTableOrders(restaurantId, t.id));
          return [t.id, orders] as const;
        } catch {
          return [t.id, this._ordersByTable()[t.id] ?? []] as const;
        }
      })
    );
    this._ordersByTable.set(Object.fromEntries(entries));
  }

  async updateStatus(restaurantId: string, tableId: string, estado: TableStatus): Promise<void> {
    try {
      const updated = await firstValueFrom(this.tableService.updateStatus(restaurantId, tableId, { estado }));
      this._tables.update(tables => tables.map(t => (t.id === tableId ? updated : t)));
      this._error.set(null);
      await this.loadOrdersForOccupied(restaurantId, this._tables());
    } catch (err: any) {
      this._error.set(this.errorMessage(err, 'Error al cambiar el estado de la mesa'));
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling();
    this.loadTables(restaurantId);
    this.pollingInterval = setInterval(() => this.loadTables(restaurantId), 15000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
