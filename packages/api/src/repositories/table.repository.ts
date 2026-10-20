import { Database } from '@config/database.js'
import type { Table, TableFilters } from '@models/table.model.js'

const COLUMNS = `id, restaurant_id as restaurantId, numero, descripcion, capacidad, estado,
    created_at as createdAt, updated_at as updatedAt`

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurant(restaurantId: string, filters?: TableFilters): Promise<Table[]>
    findByNumero(restaurantId: string, numero: number): Promise<Table | null>
    save(table: Table): Promise<void>
    update(table: Table): Promise<void>
    delete(id: string): Promise<void>
    /** Cambia a 'ocupada' solo si está 'libre'. Devuelve true si lo consiguió. */
    occupyIfFree(id: string, updatedAt: string): Promise<boolean>
    /** Cambia a 'libre' solo si está 'ocupada'. Devuelve true si lo consiguió. */
    releaseIfOccupied(id: string, updatedAt: string): Promise<boolean>
    hasActiveOrders(tableId: string): Promise<boolean>
}

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<Table>(`SELECT ${COLUMNS} FROM tables WHERE id = ?`, [id])
        return row ?? null
    }

    async findByRestaurant(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const where = ['restaurant_id = ?']
        const params: any[] = [restaurantId]
        if (filters.estado) {
            where.push('estado = ?')
            params.push(filters.estado)
        }
        if (filters.capacidadMin !== undefined) {
            where.push('capacidad >= ?')
            params.push(filters.capacidadMin)
        }
        const order = filters.orden === 'capacidad' ? 'capacidad ASC, numero ASC' : 'numero ASC'
        return this.db.all<Table>(`SELECT ${COLUMNS} FROM tables WHERE ${where.join(' AND ')} ORDER BY ${order}`, params)
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        const row = await this.db.get<Table>(
            `SELECT ${COLUMNS} FROM tables WHERE restaurant_id = ? AND numero = ?`,
            [restaurantId, numero]
        )
        return row ?? null
    }

    async save(table: Table): Promise<void> {
        await this.db.run(
            'INSERT INTO tables (id, restaurant_id, numero, descripcion, capacidad, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [table.id, table.restaurantId, table.numero, table.descripcion, table.capacidad, table.estado, table.createdAt, table.updatedAt]
        )
    }

    async update(table: Table): Promise<void> {
        await this.db.run(
            'UPDATE tables SET numero = ?, descripcion = ?, capacidad = ?, estado = ?, updated_at = ? WHERE id = ?',
            [table.numero, table.descripcion, table.capacidad, table.estado, table.updatedAt, table.id]
        )
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    async occupyIfFree(id: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET estado = 'ocupada', updated_at = ? WHERE id = ? AND estado = 'libre'",
            [updatedAt, id]
        )
        return result.changes > 0
    }

    async releaseIfOccupied(id: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET estado = 'libre', updated_at = ? WHERE id = ? AND estado = 'ocupada'",
            [updatedAt, id]
        )
        return result.changes > 0
    }

    async hasActiveOrders(tableId: string): Promise<boolean> {
        const row = await this.db.get<{ n: number }>(
            `SELECT COUNT(*) as n FROM orders o JOIN order_items oi ON o.id = oi.order_id
             WHERE o.table_id = ? AND oi.status != 'entregado'`,
            [tableId]
        )
        return (row?.n ?? 0) > 0
    }
}
