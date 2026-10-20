export type TableStatus = 'libre' | 'ocupada' | 'reservada'

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
