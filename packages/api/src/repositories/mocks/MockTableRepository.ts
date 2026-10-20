import type { TableRepository } from '@repositories/table.repository.js'
import type { Table, TableFilters } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    tables: Map<string, Table> = new Map()
    tablesWithActiveOrders: Set<string> = new Set()

    async findById(id: string): Promise<Table | null> {
        const t = this.tables.get(id)
        return t ? { ...t } : null
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const list = Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .filter(t => !filters.estado || t.estado === filters.estado)
            .filter(t => filters.capacidadMin === undefined || t.capacidad >= filters.capacidadMin)
        list.sort((a, b) => filters.orden === 'capacidad'
            ? a.capacidad - b.capacidad || a.numero - b.numero
            : a.numero - b.numero)
        return list.map(t => ({ ...t }))
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        const t = Array.from(this.tables.values()).find(x => x.restaurantId === restaurantId && x.numero === numero)
        return t ? { ...t } : null
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, { ...table })
    }

    async update(table: Table): Promise<void> {
        this.tables.set(table.id, { ...table })
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    async occupyIfFree(id: string, updatedAt: string): Promise<boolean> {
        const t = this.tables.get(id)
        if (!t || t.estado !== 'libre') return false
        t.estado = 'ocupada'
        t.updatedAt = updatedAt
        return true
    }

    async releaseIfOccupied(id: string, updatedAt: string): Promise<boolean> {
        const t = this.tables.get(id)
        if (!t || t.estado !== 'ocupada') return false
        t.estado = 'libre'
        t.updatedAt = updatedAt
        return true
    }

    async hasActiveOrders(tableId: string): Promise<boolean> {
        return this.tablesWithActiveOrders.has(tableId)
    }
}
