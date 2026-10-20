import { InvalidTableStatusError } from '@errors/DomainErrors.js'

export const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatus = typeof VALID_TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    numero: number
    descripcion: string | null
    capacidad: number
    estado: TableStatus
    createdAt: string
    updatedAt: string
}

export interface TableFilters {
    estado?: TableStatus
    capacidadMin?: number
    orden?: 'numero' | 'capacidad'
}

export function normalizeTableStatus(value: unknown): TableStatus {
    const normalized = typeof value === 'string' ? value.toLowerCase().trim() : ''
    if (!VALID_TABLE_STATUSES.includes(normalized as TableStatus)) {
        throw new InvalidTableStatusError(`Invalid table status: ${String(value)}. Must be one of: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatus
}
