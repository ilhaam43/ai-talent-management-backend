import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { User } from "./users.entity";
import { Repository } from "../common/repository.interface";

import * as bcrypt from "bcrypt";

@Injectable()
export class UsersRepository implements Repository<User> {
  private table = "users";
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return new User(
      row.id,
      row.name,
      row.email,
      row.emailVerified,
      row.password,
      row.createdAt,
      row.updatedAt,
      row.guideDismissed
    );
  }
  async findAll() {
    const rows = await this.prisma.user.findMany();
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
          r.guideDismissed
        )
    );
  }
  async create(data: {
    id: string;
    name: string;
    email: string;
    password: string;
  }) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);
    const row = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
    return new User(
      row.id,
      row.name,
      row.email,
      row.emailVerified,
      row.password,
      row.createdAt,
      row.updatedAt,
      row.guideDismissed
    );
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    if (!row) return null;
    return new User(
      row.id,
      row.name,
      row.email,
      row.emailVerified,
      row.password,
      row.createdAt,
      row.updatedAt,
      row.guideDismissed
    );
  }

  async update(id: string, data: {
    name?: string;
    email?: string;
    password?: string;
    guideDismissed?: boolean;
  }) {
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, await bcrypt.genSalt());
      data.password = hashedPassword;
    }
    const row = await this.prisma.user.update({
      where: { id },
      data,
    });
    return row;
  }

  async getGuideStatus(id: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: { guideDismissed: true },
    });
    return row?.guideDismissed ?? false;
  }

  async updateGuideStatus(id: string, guideDismissed: boolean): Promise<boolean> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { guideDismissed },
      select: { guideDismissed: true },
    });
    return row.guideDismissed;
  }
}
