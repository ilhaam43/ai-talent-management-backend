import { Injectable } from '@nestjs/common'

export type TableRow = Record<string, unknown>

@Injectable()
export class DatabaseService {
  private tables = new Map<string, Map<string, TableRow>>()

  private getTable(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map())
    return this.tables.get(name) as Map<string, TableRow>
  }

  insert(table: string, id: string, data: TableRow) {
    const t = this.getTable(table)
    t.set(id, { ...data })
    return t.get(id)
  }

  findById(table: string, id: string) {
    const t = this.getTable(table)
    return t.get(id) || null
  }

  update(table: string, id: string, data: TableRow) {
    const t = this.getTable(table)
    if (!t.has(id)) return null
    t.set(id, { ...(t.get(id) as TableRow), ...data })
    return t.get(id)
  }

  remove(table: string, id: string) {
    const t = this.getTable(table)
    const existed = t.get(id) || null
    t.delete(id)
    return existed
  }

  findAll(table: string) {
    const t = this.getTable(table)
    return Array.from(t.entries()).map(([id, row]) => ({ id, ...row }))
  }
}