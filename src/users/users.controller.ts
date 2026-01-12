import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { UsersService } from "./users.service";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { AuthGuard } from "@nestjs/passport";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) { }

  @Get("test/hr-only")
  @Roles("HUMAN RESOURCES")
  getHrData() {
    return { message: "Hello HR!" };
  }

  @Get()
  @Roles("HUMAN RESOURCES", "ADMIN")
  list() {
    return this.service.list();
  }

  @Get(":id")
  @Roles("HUMAN RESOURCES", "ADMIN")
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: CreateUserDto) {
    return this.service.create(body);
  }

  @Put()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiBody({ type: UpdateUserDto })
  update(@Body() body: UpdateUserDto) {
    return this.service.update({ ...body });
  }
}
