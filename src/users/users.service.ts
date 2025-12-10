import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}
  async getById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException("User not found");
    return item;
  }
  async list() {
    return this.repo.findAll();
  }
  async create(data: {
    id: string;
    name: string;
    email: string;
    password: string;
  }) {
    return this.repo.create(data);
  }
  async findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }
}
