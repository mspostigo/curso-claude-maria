import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Table } from '@models/table.model.js'
import {
    OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError,
    TableRestaurantMismatchError, TableNotOccupiedError
} from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with table', () => {
    let tables: MockTableRepository
    let service: OrderService
    const base = { restaurantId: 'rest-1', clientId: 'c1', items: [{ dishId: 'd1', quantity: 2, notes: null }] }
    const table = (over: Partial<Table> = {}): Table => ({
        id: 't1', restaurantId: 'rest-1', numero: 7, descripcion: null, capacidad: 4,
        estado: 'ocupada', createdAt: '', updatedAt: '', ...over
    })

    beforeEach(() => {
        tables = new MockTableRepository()
        service = new OrderService(new MockOrderRepository(), tables)
    })

    it('creates an order for an occupied table of the restaurant, with tableNumber', async () => {
        await tables.save(table())
        const order = await service.create({ ...base, tableId: 't1' })
        expect(order.tableId).toBe('t1')
        expect(order.tableNumber).toBe(7)
        expect(order.items).toHaveLength(2)
    })

    it('allows orders without table', async () => {
        const order = await service.create({ ...base, tableId: null })
        expect(order.tableId).toBeNull()
    })

    it('throws TableNotFoundError if table does not exist', async () => {
        await expect(service.create({ ...base, tableId: 'zz' })).rejects.toThrow(TableNotFoundError)
    })

    it('throws TableRestaurantMismatchError for another restaurant', async () => {
        await tables.save(table({ restaurantId: 'other' }))
        await expect(service.create({ ...base, tableId: 't1' })).rejects.toThrow(TableRestaurantMismatchError)
    })

    it('throws TableNotOccupiedError if table is not occupied', async () => {
        await tables.save(table({ estado: 'libre' }))
        await expect(service.create({ ...base, tableId: 't1' })).rejects.toThrow(TableNotOccupiedError)
    })
})
