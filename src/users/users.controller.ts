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
import { ApiBearerAuth, ApiBody, ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
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
  @ApiOperation({ summary: 'Test endpoint for HR role access' })
  @ApiResponse({ status: 200, description: 'Access granted' })
  @ApiResponse({ status: 403, description: 'Forbidden (Role mismatch)' })
  getHrData() {
    return { message: "Hello HR!" };
  }

  @Get()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Return list of users' })
  list() {
    return this.service.list();
  }

  @Get(":id")
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Return user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(@Body() body: CreateUserDto) {
    return this.service.create(body);
  }

  @Put()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  update(@Body() body: UpdateUserDto) {
    return this.service.update({ ...body });
  }
}
