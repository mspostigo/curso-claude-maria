import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'

describe('TableService', () => {
    let tables: MockTableRepository
    let restaurants: MockRestaurantRepository
    let orders: MockOrderRepository
    let service: TableService

    beforeEach(async () => {
        tables = new MockTableRepository()
        restaurants = new MockRestaurantRepository()
        orders = new MockOrderRepository()
        await restaurants.save({
            id: 'r1', name: 'R', address: 'a', email: 'e@e.com', phone: '+34 600000000',
            ownerFirstName: 'a', ownerLastName: 'b', logoUrl: null, createdAt: '', updatedAt: ''
        })
        service = new TableService(tables, restaurants, orders)
    })

    const dto = { numero: 1, descripcion: 'Terraza', capacidad: 4 }

    describe('create', () => {
        it('creates a free table by default', async () => {
            const t = await service.create('r1', dto)
            expect(t.estado).toBe('libre')
            expect(t.restaurantId).toBe('r1')
            expect(await tables.findById(t.id)).not.toBeNull()
        })
        it('accepts null description and explicit estado', async () => {
            const t = await service.create('r1', { numero: 2, capacidad: 2, estado: 'reservada' })
            expect(t.descripcion).toBeNull()
            expect(t.estado).toBe('reservada')
        })
        it('rejects unknown restaurant', async () => {
            await expect(service.create('nope', dto)).rejects.toThrow('Restaurant not found')
        })
        it('rejects invalid numero', async () => {
            await expect(service.create('r1', { ...dto, numero: 0 })).rejects.toThrow('Table number')
            await expect(service.create('r1', { ...dto, numero: 1.5 })).rejects.toThrow('Table number')
            await expect(service.create('r1', { ...dto, numero: '1' as any })).rejects.toThrow('Table number')
        })
        it('rejects invalid capacidad', async () => {
            await expect(service.create('r1', { ...dto, capacidad: 0 })).rejects.toThrow('Table capacity')
            await expect(service.create('r1', { ...dto, capacidad: 101 })).rejects.toThrow('Table capacity')
        })
        it('rejects invalid estado', async () => {
            await expect(service.create('r1', { ...dto, estado: 'rota' as any })).rejects.toThrow('Invalid table status')
        })
        it('rejects long description', async () => {
            await expect(service.create('r1', { ...dto, descripcion: 'x'.repeat(201) })).rejects.toThrow('description')
        })
        it('rejects duplicated numero in same restaurant', async () => {
            await service.create('r1', dto)
            await expect(service.create('r1', dto)).rejects.toThrow('already exists')
        })
    })

    describe('list', () => {
        it('filters by estado and capacidadMin, sorted', async () => {
            await service.create('r1', { numero: 3, capacidad: 2 })
            await service.create('r1', { numero: 1, capacidad: 6 })
            await service.create('r1', { numero: 2, capacidad: 4, estado: 'ocupada' })
            const all = await service.list('r1', {})
            expect(all.map(t => t.numero)).toEqual([1, 2, 3])
            const libres = await service.list('r1', { estado: 'libre', capacidadMin: 3, orden: 'capacidad' })
            expect(libres.map(t => t.numero)).toEqual([1])
        })
        it('rejects unknown restaurant', async () => {
            await expect(service.list('nope', {})).rejects.toThrow('Restaurant not found')
        })
    })

    describe('getById', () => {
        it('throws if not found or other restaurant', async () => {
            const t = await service.create('r1', dto)
            await expect(service.getById('r2', t.id)).rejects.toThrow('Table not found')
            await expect(service.getById('r1', 'x')).rejects.toThrow('Table not found')
        })
    })

    describe('update', () => {
        it('replaces fields and keeps estado when absent', async () => {
            const t = await service.create('r1', { ...dto, estado: 'reservada' })
            const u = await service.update('r1', t.id, { numero: 5, descripcion: null, capacidad: 8 })
            expect(u.numero).toBe(5)
            expect(u.capacidad).toBe(8)
            expect(u.estado).toBe('reservada')
        })
        it('allows keeping its own numero but rejects another table numero', async () => {
            const a = await service.create('r1', dto)
            await service.create('r1', { numero: 2, capacidad: 2 })
            await expect(service.update('r1', a.id, { numero: 1, capacidad: 5 })).resolves.toBeDefined()
            await expect(service.update('r1', a.id, { numero: 2, capacidad: 5 })).rejects.toThrow('already exists')
        })
    })

    describe('delete', () => {
        it('deletes free table', async () => {
            const t = await service.create('r1', dto)
            await service.delete('r1', t.id)
            expect(await tables.findById(t.id)).toBeNull()
        })
        it('rejects occupied table', async () => {
            const t = await service.create('r1', { ...dto, estado: 'ocupada' })
            await expect(service.delete('r1', t.id)).rejects.toThrow('occupied or has active orders')
        })
        it('rejects table with active orders', async () => {
            const t = await service.create('r1', dto)
            tables.tablesWithActiveOrders.add(t.id)
            await expect(service.delete('r1', t.id)).rejects.toThrow('occupied or has active orders')
        })
    })

    describe('updateStatus', () => {
        it('changes estado', async () => {
            const t = await service.create('r1', dto)
            expect((await service.updateStatus('r1', t.id, 'reservada')).estado).toBe('reservada')
        })
        it('rejects invalid estado', async () => {
            const t = await service.create('r1', dto)
            await expect(service.updateStatus('r1', t.id, 'x')).rejects.toThrow('Invalid table status')
        })
    })

    describe('occupy', () => {
        it('occupies a free table', async () => {
            const t = await service.create('r1', dto)
            expect((await service.occupy('r1', t.id, 3)).estado).toBe('ocupada')
        })
        it('rejects invalid people', async () => {
            const t = await service.create('r1', dto)
            await expect(service.occupy('r1', t.id, 0)).rejects.toThrow('Number of people must')
            await expect(service.occupy('r1', t.id, undefined)).rejects.toThrow('Number of people must')
        })
        it('rejects people over capacity', async () => {
            const t = await service.create('r1', dto)
            await expect(service.occupy('r1', t.id, 5)).rejects.toThrow('exceeds')
        })
        it('rejects non-free tables (second occupier loses)', async () => {
            const t = await service.create('r1', dto)
            await service.occupy('r1', t.id, 2)
            await expect(service.occupy('r1', t.id, 2)).rejects.toThrow('not available')
            const r = await service.create('r1', { numero: 2, capacidad: 2, estado: 'reservada' })
            await expect(service.occupy('r1', r.id, 2)).rejects.toThrow('not available')
        })
        it('404 on missing table', async () => {
            await expect(service.occupy('r1', 'x', 2)).rejects.toThrow('Table not found')
        })
    })

    describe('release', () => {
        it('frees an occupied table', async () => {
            const t = await service.create('r1', { ...dto, estado: 'ocupada' })
            expect((await service.release('r1', t.id)).estado).toBe('libre')
        })
        it('rejects when not occupied', async () => {
            const t = await service.create('r1', dto)
            await expect(service.release('r1', t.id)).rejects.toThrow('not occupied')
        })
    })

    describe('listActiveOrders', () => {
        it('returns active orders of the table', async () => {
            const t = await service.create('r1', dto)
            await orders.create({ id: 'o1', restaurantId: 'r1', tableId: t.id, clientId: null, createdAt: new Date(), items: [] })
            await orders.create({ id: 'o2', restaurantId: 'r1', tableId: 'other', clientId: null, createdAt: new Date(), items: [] })
            const res = await service.listActiveOrders('r1', t.id)
            expect(res.map(o => o.id)).toEqual(['o1'])
        })
    })
})
