import { Order } from '../../orders/models/order.model'

export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export const TABLE_STATUSES: TableStatus[] = ['libre', 'ocupada', 'reservada']

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

export interface UpdateTableStatusDto {
  estado: TableStatus
}

export type TableOrder = Order
