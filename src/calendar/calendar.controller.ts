import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get interview calendar',
        description:
            'Returns all candidate application pipelines that are in interview stages (HR Interview, User Interview) with their associated interview data including scheduled times, location, and scores.',
    })
    @ApiResponse({
        status: 200,
        description: 'List of interview calendar items',
        type: CalendarResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - HR role required' })
    async getInterviewCalendar(): Promise<CalendarResponseDto> {
        return this.calendarService.getInterviewCalendar();
    }
}
