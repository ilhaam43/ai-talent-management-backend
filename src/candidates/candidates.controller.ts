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
import { ApiBearerAuth, ApiBody, ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { CandidateAiInsightResponseDto } from "./dto/candidate-ai-insight-response.dto";
import { Prisma } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { UpdateCandidateSettingsDto } from "./dto/update-candidate-settings.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("candidates")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("candidates")
export class CandidatesController {
  constructor(private readonly service: CandidatesService) { }
  @Get(":id/ai-insights")
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER", "CANDIDATE")
  @ApiOperation({ summary: 'Get AI insights for a candidate' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'AI insights retrieved successfully', type: CandidateAiInsightResponseDto, isArray: true })
  getAiInsights(@Param("id") id: string) {
    return this.service.getAiInsights(id);
  }

  @Get(":id")
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER", "CANDIDATE")
  @ApiOperation({ summary: 'Get candidate details by ID' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate details retrieved successfully' })
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

  @Get(":id/settings")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  getSettings(@Param("id") id: string) {
    return this.service.getSettings(id);
  }

  @Patch(":id/settings")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  @ApiBody({ type: UpdateCandidateSettingsDto })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateSettings(@Param("id") id: string, @Body() dto: UpdateCandidateSettingsDto) {
    return this.service.updateSettings(id, dto);
  }
}
