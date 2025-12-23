import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { User } from './users.entity'
import { Repository } from '../common/repository.interface'

@Injectable()
export class UsersRepository implements Repository<User> {
  private table = 'users'
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } })
    if (!row) return null
    return new User(
      row.id,
      row.name,
      row.email,
      row.emailVerified,
      row.password,
      row.createdAt,
      row.updatedAt,
    )
  }
  async findAll() {
    const rows = await this.prisma.user.findMany()
    return rows.map(
      (r) =>
        new User(
          r.id,
          r.name,
          r.email,
          r.emailVerified,
          r.password,
          r.createdAt,
          r.updatedAt,
        ),
    )
  }
  async create(data: {
    id: string
    name: string
    email: string
    password: string
  }) {
    const row = await this.prisma.user.create({ data })
    return new User(
      row.id,
      row.name,
      row.email,
      row.emailVerified,
      row.password,
      row.createdAt,
      row.updatedAt,
    )
  }
}
