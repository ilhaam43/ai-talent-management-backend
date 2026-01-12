import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}
  async getById(id: string) {
    const item = await this.repo.findById(id)
    if (!item) throw new NotFoundException('Users not found')
    return item
  }
  async list() {
    return this.repo.findAll()
  }
  async create(data: { id: string; title: string; description: string }) {
    return this.repo.create(data)
  }
}
