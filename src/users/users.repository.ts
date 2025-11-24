import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { Users } from './users.entity'
import { Repository } from '../common/repository.interface'

@Injectable()
export class UsersRepository implements Repository<Users> {
  private table = 'users'
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string) {
    const row = await this.prisma.users.findUnique({ where: { id } })
    if (!row) return null
    return new Users(id, String(row.title), String(row.description))
  }
  async findAll() {
    const rows = await this.prisma.users.findMany()
    return rows.map((r: { id: any; title: any; description: any }) => new Users(String(r.id), String(r.title), String(r.description)))
  }
  async create(data: { id: string; title: string; description: string }) {
    const row = await this.prisma.users.create({ data })
    return new Users(row.id, row.title, row.description)
  }
}
