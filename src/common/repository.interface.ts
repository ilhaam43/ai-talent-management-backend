export interface Repository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: { id: string; title: string; description: string }): Promise<T>
}