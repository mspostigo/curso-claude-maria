import { randomUUID } from 'crypto'
import type { Table, TableFilters, TableStatus } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { Order } from '@models/order.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import {
    RestaurantNotFoundError,
    TableNotFoundError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableDescriptionError,
    InvalidPeopleError,
    TableCapacityExceededError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableNotOccupiedError,
    TableInUseError
} from '@errors/DomainErrors.js'

export interface TableDTO {
    numero: number
    descripcion?: string | null
    capacidad: number
    estado?: TableStatus
}

const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository,
        private readonly orderRepository: OrderRepository
    ) {}

    async create(restaurantId: string, dto: TableDTO): Promise<Table> {
        await this.ensureRestaurant(restaurantId)
        const fields = this.validate(dto)
        await this.ensureNumeroFree(restaurantId, fields.numero)
        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            restaurantId,
            ...fields,
            estado: dto.estado === undefined ? 'libre' : normalizeTableStatus(dto.estado),
            createdAt: now,
            updatedAt: now
        }
        await this.tableRepository.save(table)
        return table
    }

    async list(restaurantId: string, filters: TableFilters): Promise<Table[]> {
        await this.ensureRestaurant(restaurantId)
        return this.tableRepository.findByRestaurant(restaurantId, filters)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) throw new TableNotFoundError()
        return table
    }

    async update(restaurantId: string, id: string, dto: TableDTO): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const fields = this.validate(dto)
        if (fields.numero !== existing.numero) await this.ensureNumeroFree(restaurantId, fields.numero)
        const updated: Table = {
            ...existing,
            ...fields,
            estado: dto.estado === undefined ? existing.estado : normalizeTableStatus(dto.estado),
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.update(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const table = await this.getById(restaurantId, id)
        if (table.estado === 'ocupada' || await this.tableRepository.hasActiveOrders(id)) {
            throw new TableInUseError()
        }
        await this.tableRepository.delete(id)
    }

    async updateStatus(restaurantId: string, id: string, estado: unknown): Promise<Table> {
        const table = await this.getById(restaurantId, id)
        const normalized = normalizeTableStatus(estado)
        const updated = { ...table, estado: normalized, updatedAt: new Date().toISOString() }
        await this.tableRepository.update(updated)
        return updated
    }

    async occupy(restaurantId: string, id: string, personas: unknown): Promise<Table> {
        if (!isPositiveInt(personas)) throw new InvalidPeopleError()
        const table = await this.getById(restaurantId, id)
        if (personas > table.capacidad) throw new TableCapacityExceededError()
        const ok = await this.tableRepository.occupyIfFree(id, new Date().toISOString())
        if (!ok) throw new TableNotAvailableError()
        return this.getById(restaurantId, id)
    }

    async release(restaurantId: string, id: string): Promise<Table> {
        await this.getById(restaurantId, id)
        const ok = await this.tableRepository.releaseIfOccupied(id, new Date().toISOString())
        if (!ok) throw new TableNotOccupiedError()
        return this.getById(restaurantId, id)
    }

    async listActiveOrders(restaurantId: string, id: string): Promise<Order[]> {
        await this.getById(restaurantId, id)
        return this.orderRepository.findActiveByTable(id)
    }

    private async ensureRestaurant(restaurantId: string): Promise<void> {
        if (!await this.restaurantRepository.findById(restaurantId)) throw new RestaurantNotFoundError()
    }

    private async ensureNumeroFree(restaurantId: string, numero: number): Promise<void> {
        if (await this.tableRepository.findByNumero(restaurantId, numero)) throw new DuplicatedTableNumberError()
    }

    private validate(dto: TableDTO): { numero: number; descripcion: string | null; capacidad: number } {
        if (!isPositiveInt(dto.numero)) throw new InvalidTableNumberError()
        if (!isPositiveInt(dto.capacidad) || dto.capacidad > 100) throw new InvalidTableCapacityError()
        let descripcion: string | null = null
        if (dto.descripcion !== undefined && dto.descripcion !== null) {
            if (typeof dto.descripcion !== 'string' || dto.descripcion.length > 200) throw new InvalidTableDescriptionError()
            descripcion = dto.descripcion.trim() === '' ? null : dto.descripcion.trim()
        }
        return { numero: dto.numero, descripcion, capacidad: dto.capacidad }
    }
}
