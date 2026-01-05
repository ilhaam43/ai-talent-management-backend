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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { UpdateCandidateSettingsDto } from "./dto/update-candidate-settings.dto";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CandidateResponseDto } from "./dto/candidate-response.dto";

@ApiTags("candidates")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("candidates")
export class CandidatesController {
  constructor(private readonly service: CandidatesService) { }
  @Get(":id")
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER", "CANDIDATE")
  @ApiOperation({ summary: "Get candidate by ID with full details" })
  @ApiParam({ name: "id", description: "Candidate UUID" })
  @ApiResponse({
    status: 200,
    description: "Candidate details with all relations",
    type: CandidateResponseDto,
  })
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }
  @Get()
  @Roles("HUMAN RESOURCES", "ADMIN", "HIRING MANAGER")
  @ApiOperation({ summary: "List all candidates" })
  @ApiResponse({ status: 200, description: "List of candidates" })
  list() {
    return this.service.findAll();
  }
  @Post()
  @Roles("HUMAN RESOURCES", "ADMIN")
  @ApiOperation({ summary: "Create a new candidate profile" })
  @ApiBody({
    schema: { type: "object", properties: { userId: { type: "string" } } },
  })
  @ApiResponse({ status: 201, description: "Candidate created successfully" })
  create(@Body() body: { userId: string }) {
    return this.service.create(body.userId);
  }
  @Patch(":id")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  @ApiOperation({ summary: "Update candidate profile" })
  @ApiParam({ name: "id", description: "Candidate UUID" })
  @ApiBody({ type: UpdateCandidateDto })
  @ApiResponse({ status: 200, description: "Candidate updated successfully" })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  update(@Param("id") id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.update(id, dto);
  }

  @Get(":id/settings")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  @ApiOperation({ summary: "Get candidate settings" })
  @ApiParam({ name: "id", description: "Candidate UUID" })
  @ApiResponse({ status: 200, description: "Candidate settings" })
  getSettings(@Param("id") id: string) {
    return this.service.getSettings(id);
  }

  @Patch(":id/settings")
  @Roles("HUMAN RESOURCES", "ADMIN", "CANDIDATE")
  @ApiOperation({ summary: "Update candidate settings" })
  @ApiParam({ name: "id", description: "Candidate UUID" })
  @ApiBody({ type: UpdateCandidateSettingsDto })
  @ApiResponse({ status: 200, description: "Settings updated successfully" })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateSettings(@Param("id") id: string, @Body() dto: UpdateCandidateSettingsDto) {
    return this.service.updateSettings(id, dto);
  }
}
