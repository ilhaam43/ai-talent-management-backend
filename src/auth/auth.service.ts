import { Injectable } from '@nestjs/common'
import { CandidatesService } from '../candidates/candidates.service'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(private readonly candidatesService: CandidatesService, private readonly jwt: JwtService) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.candidatesService.findOne(email)
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id }
    return {
      access_token: this.jwt.sign(payload)
    }
  }
}