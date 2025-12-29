import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('rbac-test')
@ApiBearerAuth()
@Controller('rbac-test')
export class TestRbacController {
    @Get('hr')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    testHR() {
        return {
            message: 'Success! You have HR access',
            role: 'HUMAN RESOURCES'
        };
    }

    @Get('hiring-manager')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HIRING MANAGER')
    testHiringManager() {
        return {
            message: 'Success! You have Hiring Manager access',
            role: 'HIRING MANAGER'
        };
    }

    @Get('candidate')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('CANDIDATE')
    testCandidate() {
        return {
            message: 'Success! You have Candidate access',
            role: 'CANDIDATE'
        };
    }

    @Get('public')
    testPublic() {
        return {
            message: 'This is a public endpoint - no auth required'
        };
    }
}
