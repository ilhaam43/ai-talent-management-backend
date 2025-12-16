import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { AuthGuard } from "@nestjs/passport";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get(":id")
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }
  @Get()
  list() {
    return this.service.list();
  }
  @Post()
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: CreateUserDto) {
    return this.service.create(body);
  }
  @Put()
  @UseGuards(AuthGuard("jwt"))
  @ApiBody({ type: UpdateUserDto })
  update(@Body() body: UpdateUserDto) {
    return this.service.update({ ...body });
  }
}
