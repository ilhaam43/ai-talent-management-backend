import { Controller, Get, Param, Post, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { ApiBody, ApiTags } from '@nestjs/swagger'
import { CreateUserDto } from './dto/create-user.dto'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id)
  }
  @Get()
  list() {
    return this.service.list()
  }
  @Post()
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: CreateUserDto) {
    return this.service.create(body)
  }
}
