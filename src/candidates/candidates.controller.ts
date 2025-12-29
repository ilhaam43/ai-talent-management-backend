import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from "@nestjs/common";
import { CandidatesService } from "./candidates.service";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("candidates")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("candidates")
export class CandidatesController {
  constructor(private readonly service: CandidatesService) { }
  @Get(":id")
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER", "CANDIDATE")
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }
  @Get()
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER")
  list() {
    return this.service.findAll();
  }
  @Post()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiBody({
    schema: { type: "object", properties: { userId: { type: "string" } } },
  })
  create(@Body() body: { userId: string }) {
    return this.service.create(body.userId);
  }
  @Patch(":id")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  @ApiBody({ type: UpdateCandidateDto })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  update(@Param("id") id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.update(id, dto);
  }
}
