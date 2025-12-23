import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { Users } from './users.entity'
import { Repository } from '../common/repository.interface'

@Injectable()
export class UsersRepository implements Repository<Users> {
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } })
    if (!row) return null
    return new Users(id, String(row.name), String(row.email))
  }
  async findAll() {
    const rows = await this.prisma.user.findMany()
    return rows.map((r) => new Users(String(r.id), String(r.name), String(r.email)))
  }
  async create(data: { id: string; name: string; email: string; password: string }) {
    const row = await this.prisma.user.create({ data })
    return new Users(row.id, row.name, row.email)
  }
}
