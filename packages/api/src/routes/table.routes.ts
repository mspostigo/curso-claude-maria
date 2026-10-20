import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(
    new SqliteTableRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig),
    new SqliteOrderRepository(dbConfig)
)
const controller = new TableController(tableService)

const ALL = ['admin', 'manager', 'cocinero', 'camarero', 'cliente']
const STAFF = ['admin', 'manager', 'cocinero', 'camarero']
const MANAGEMENT = ['admin', 'manager']

const router = Router({ mergeParams: true })

router.get('/', authenticate, authorize(ALL), controller.list)
router.post('/', authenticate, authorize(MANAGEMENT), controller.create)
router.get('/:id', authenticate, authorize(ALL), controller.getById)
router.put('/:id', authenticate, authorize(MANAGEMENT), controller.update)
router.delete('/:id', authenticate, authorize(MANAGEMENT), controller.delete)
router.patch('/:id/status', authenticate, authorize(STAFF), controller.updateStatus)
router.post('/:id/occupy', authenticate, authorize(ALL), controller.occupy)
router.post('/:id/release', authenticate, authorize(ALL), controller.release)
router.get('/:id/orders', authenticate, authorize(STAFF), controller.listOrders)

export default router
