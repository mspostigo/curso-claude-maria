import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableOrder, TableStatus, TABLE_STATUSES } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);
  readonly statuses = TABLE_STATUSES;

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId ?? undefined;
  }

  ngOnInit(): void {
    const id = this.restaurantId;
    if (id) this.tableStore.startPolling(id);
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  changeStatus(table: Table, estado: TableStatus): void {
    const id = this.restaurantId;
    if (id && estado !== table.estado) {
      this.tableStore.updateStatus(id, table.id, estado);
    }
  }

  ordersOf(table: Table): TableOrder[] {
    return this.tableStore.ordersByTable()[table.id] ?? [];
  }
}
