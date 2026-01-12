import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { RolesGuard } from "../common/guards/roles.guard";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, RolesGuard],
  exports: [UsersService],
})
export class UsersModule { }
