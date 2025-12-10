import { Injectable } from "@nestjs/common";
import { CandidatesService } from "../candidates/candidates.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly usersService: UsersService,
    private readonly jwt: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    // Check candidate first
    const candidate = await this.candidatesService.findOne(email);
    if (
      candidate &&
      candidate.password &&
      (await bcrypt.compare(pass, candidate.password))
    ) {
      const { password, ...result } = candidate;
      return result;
    }

    // Check user
    const user = await this.usersService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email || user.candidateEmail, sub: user.id };
    return {
      access_token: this.jwt.sign(payload),
    };
  }
}
