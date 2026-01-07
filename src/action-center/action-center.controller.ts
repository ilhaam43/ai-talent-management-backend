import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { ActionCenterService } from './action-center.service';
import {
    ActionCenterFilterDto,
    ActionCenterSummaryDto,
    ActionCenterTaskDto,
} from './dto/action-center.dto';

@ApiTags('action-center')
@Controller('action-center')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ActionCenterController {
    constructor(private readonly actionCenterService: ActionCenterService) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get action center summary with pipeline status counts' })
    @ApiResponse({
        status: 200,
        description: 'Returns summary counts for different pipeline stages',
        type: ActionCenterSummaryDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getSummary(): Promise<ActionCenterSummaryDto> {
        return this.actionCenterService.getSummary();
    }

    @Get('tasks')
    @ApiOperation({ summary: 'Get list of tasks/applications requiring action' })
    @ApiQuery({ name: 'taskType', required: false, description: 'Filter by task type' })
    @ApiQuery({
        name: 'jobVacancyStatus',
        required: false,
        description: 'Filter by job vacancy status',
    })
    @ApiQuery({ name: 'departmentId', required: false, description: 'Filter by department' })
    @ApiQuery({ name: 'search', required: false, description: 'Search by job role name' })
    @ApiResponse({
        status: 200,
        description: 'Returns list of tasks requiring action',
        type: [ActionCenterTaskDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getTasks(@Query() filters: ActionCenterFilterDto): Promise<ActionCenterTaskDto[]> {
        return this.actionCenterService.getTasks(filters);
    }

    @Get('tasks/:id')
    @ApiOperation({ summary: 'Get specific task details by ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns task details',
        type: ActionCenterTaskDto,
    })
    @ApiResponse({ status: 404, description: 'Task not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getTaskById(@Param('id') id: string): Promise<ActionCenterTaskDto | null> {
        return this.actionCenterService.getTaskById(id);
    }
}
