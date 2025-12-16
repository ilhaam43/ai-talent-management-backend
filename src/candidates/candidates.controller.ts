import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common'
import { CandidatesService } from './candidates.service'
import { ApiBody, ApiTags } from '@nestjs/swagger'
import { Prisma } from '@prisma/client'

@ApiTags('candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id)
  }
  @Get()
  list() {
    return this.service.findAll()
  }
  @Post()
  @ApiBody({ schema: { type: 'object', properties: { userId: { type: 'string' } } } })
  create(@Body() body: { userId: string }) {
    return this.service.create(body.userId)
  }
  @Patch(':id')
  @ApiBody({ schema: { type: 'object', properties: { data: { type: 'object' } } } })
  update(@Param('id') id: string, @Body() body: { data: any }) {
    console.log(id, body.data)
    return this.service.update(id, body.data)
  }
}
