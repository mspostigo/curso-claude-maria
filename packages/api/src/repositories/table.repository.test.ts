import { SqliteTableRepository } from './table.repository.js'
import { SqliteOrderRepository } from './order.repository.js'
import { Database } from '@config/database.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository
    const now = new Date().toISOString()
    const table = (id: string, numero: number, capacidad: number) => ({
        id, restaurantId: 'r1', numero, descripcion: null, capacidad, estado: 'libre' as const, createdAt: now, updatedAt: now
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        await db.run(
            `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at)
             VALUES ('r1','R','a','e@e.com','600000000','a','b',?,?)`, [now, now])
    })

    afterAll(async () => { await db.close() })

    it('saves, finds, filters and sorts', async () => {
        await repo.save(table('t1', 2, 6))
        await repo.save(table('t2', 1, 4))
        expect((await repo.findById('t1'))?.numero).toBe(2)
        expect((await repo.findByRestaurant('r1')).map(t => t.id)).toEqual(['t2', 't1'])
        expect((await repo.findByRestaurant('r1', { capacidadMin: 5 })).map(t => t.id)).toEqual(['t1'])
        expect((await repo.findByRestaurant('r1', { orden: 'capacidad' })).map(t => t.id)).toEqual(['t2', 't1'])
        expect((await repo.findByNumero('r1', 1))?.id).toBe('t2')
    })

    it('enforces unique numero per restaurant', async () => {
        await expect(repo.save(table('t3', 1, 2))).rejects.toThrow()
    })

    it('occupies atomically only once and releases', async () => {
        expect(await repo.occupyIfFree('t1', now)).toBe(true)
        expect(await repo.occupyIfFree('t1', now)).toBe(false)
        expect((await repo.findById('t1'))?.estado).toBe('ocupada')
        expect(await repo.releaseIfOccupied('t1', now)).toBe(true)
        expect(await repo.releaseIfOccupied('t1', now)).toBe(false)
    })

    it('detects active orders and exposes tableNumber', async () => {
        db.run("INSERT INTO dishes (id,name,price,category,restaurant_id,created_at,updated_at) VALUES ('d1','P',1,'x','r1',?,?)", [now, now])
        const orders = new SqliteOrderRepository(db)
        await orders.create({
            id: 'o1', restaurantId: 'r1', tableId: 't1', clientId: null, createdAt: new Date(),
            items: [{ id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
        })
        expect(await repo.hasActiveOrders('t1')).toBe(true)
        const found = await orders.findActiveByTable('t1')
        expect(found).toHaveLength(1)
        expect(found[0]?.tableNumber).toBe(2)
        expect((await orders.findById('o1'))?.tableNumber).toBe(2)
        await orders.updateItemStatus('o1', 'i1', 'entregado')
        expect(await repo.hasActiveOrders('t1')).toBe(false)
    })
})
