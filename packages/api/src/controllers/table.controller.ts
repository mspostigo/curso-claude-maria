import type { Request, Response, NextFunction } from 'express'
import type { TableService } from '@services/table.service.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableFilters } from '@models/table.model.js'
import { InvalidTableCapacityError } from '@errors/DomainErrors.js'

export class TableController {
    constructor(private readonly tableService: TableService) {}

    private rid = (req: Request) => req.params.restaurantId as string
    private id = (req: Request) => req.params.id as string

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters: TableFilters = {}
            if (req.query.estado !== undefined) filters.estado = normalizeTableStatus(req.query.estado)
            if (req.query.capacidadMin !== undefined) {
                const n = Number(req.query.capacidadMin)
                if (!Number.isInteger(n) || n < 1) throw new InvalidTableCapacityError()
                filters.capacidadMin = n
            }
            if (req.query.orden === 'capacidad') filters.orden = 'capacidad'
            res.status(200).json(await this.tableService.list(this.rid(req), filters))
        } catch (error) {
            next(error)
        }
    }

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(201).json(await this.tableService.create(this.rid(req), req.body ?? {}))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.getById(this.rid(req), this.id(req)))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.update(this.rid(req), this.id(req), req.body ?? {}))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(this.rid(req), this.id(req))
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.updateStatus(this.rid(req), this.id(req), req.body?.estado))
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.occupy(this.rid(req), this.id(req), req.body?.personas))
        } catch (error) {
            next(error)
        }
    }

    release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.release(this.rid(req), this.id(req)))
        } catch (error) {
            next(error)
        }
    }

    listOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.tableService.listActiveOrders(this.rid(req), this.id(req)))
        } catch (error) {
            next(error)
        }
    }
}
