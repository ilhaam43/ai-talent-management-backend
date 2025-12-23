export interface Repository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: any): Promise<T>
}