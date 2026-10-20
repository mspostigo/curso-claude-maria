export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface RestaurantTable {
  id: string
  restaurantId: string
  numero: number
  descripcion: string | null
  capacidad: number
  estado: TableStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTableDto {
  numero: number
  descripcion: string | null
  capacidad: number
  estado: TableStatus
}

export type UpdateTableDto = CreateTableDto

const TABLE_ERROR_MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en este restaurante.',
  TableInUseError: 'No se puede eliminar la mesa: está ocupada o tiene pedidos activos.',
  InvalidTableNumberError: 'El número de mesa no es válido.',
  InvalidTableCapacityError: 'La capacidad de la mesa no es válida.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.',
  TableNotFoundError: 'La mesa no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

export function tableErrorMessage(err: any, fallback: string): string {
  return TABLE_ERROR_MESSAGES[err?.error?.error] ?? err?.error?.message ?? fallback
}
