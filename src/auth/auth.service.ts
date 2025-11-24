import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async validateUser(username: string, password: string) {
    if (!username || !password) return null
    const user = await this.prisma.users.findFirst({ where: { title: username } })
    if (!user) return null
    return { id: user.id, username }
  }

  async login(user: { id: string; username: string }) {
    const payload = { sub: user.id, username: user.username }
    const access_token = await this.jwt.signAsync(payload)
    return { access_token }
  }
}