import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';

@ApiTags('Company RBAC')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ─── Company Config (existing) ────────────────────────────────────────────

  @Get('config')
  @ApiOperation({ summary: 'Get current HR user company configuration' })
  async getCompanyConfig(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.getCompanyConfig(userId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update company name or logo URL' })
  async updateCompanyConfig(@Req() req: any, @Body() dto: UpdateCompanyDto) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.updateCompanyConfig(userId, dto);
  }

  @Post('logo')
  @ApiOperation({ summary: 'Upload company logo image to MinIO aitm-company-logo bucket' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCompanyLogo(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.uploadCompanyLogo(userId, file);
  }

  // ─── Company Profile (HR Admin) ───────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get company profile (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the company profile.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async getCompanyProfile(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.getCompanyProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update company profile (HR Admin only)' })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({ status: 200, description: 'Company profile updated.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async updateCompanyProfile(@Req() req: any, @Body() dto: UpdateCompanyDto) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.updateCompanyProfile(userId, dto);
  }

  // ─── User Management (HR Admin) ───────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users in the company (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns list of company users.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async getCompanyUsers(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.getCompanyUsers(userId);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user in the company (HR Admin only)' })
  @ApiBody({ type: CreateCompanyUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async createCompanyUser(@Req() req: any, @Body() dto: CreateCompanyUserDto) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.createCompanyUser(userId, dto);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update a user role/info in the company (HR Admin only)' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiBody({ type: UpdateCompanyUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  @ApiResponse({ status: 404, description: 'User not found in your company.' })
  async updateCompanyUserRole(
    @Req() req: any,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.updateCompanyUserRole(userId, targetUserId, dto);
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Remove a user from the company (HR Admin only)' })
  @ApiParam({ name: 'userId', description: 'Target user ID to remove' })
  @ApiResponse({ status: 200, description: 'User removed successfully.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  @ApiResponse({ status: 404, description: 'User not found in your company.' })
  async removeCompanyUser(@Req() req: any, @Param('userId') targetUserId: string) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.removeCompanyUser(userId, targetUserId);
  }

  // ─── AI Plan Seat Allocation ───────────────────────────────────────────────

  @Get('plan-seats')
  @ApiOperation({ summary: 'Get company AI plan seat allocation and limits (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns seat allocation and plan details.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async getCompanyPlanSeats(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.getCompanyPlanSeats(userId);
  }

  @Get('available-employees')
  @ApiOperation({ summary: 'Search company employees not yet allocated an AI plan seat' })
  @ApiResponse({ status: 200, description: 'Returns list of unassigned employees.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async getAvailableEmployees(@Req() req: any, @Query('search') search?: string) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.getAvailableEmployees(userId, search);
  }

  @Post('plan-seats')
  @ApiOperation({ summary: 'Allocate an employee to an AI plan seat (HR Admin only)' })
  @ApiResponse({ status: 200, description: 'Seat allocated successfully.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  @ApiResponse({ status: 409, description: 'Plan seat limit reached.' })
  async allocatePlanSeat(@Req() req: any, @Body('userId') targetUserId: string) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.allocatePlanSeat(userId, targetUserId);
  }

  @Delete('plan-seats/:userId')
  @ApiOperation({ summary: 'Revoke an employee from an AI plan seat (HR Admin only)' })
  @ApiParam({ name: 'userId', description: 'Target user ID whose seat is to be revoked' })
  @ApiResponse({ status: 200, description: 'Seat revoked successfully.' })
  @ApiResponse({ status: 403, description: 'User is not the HR Admin.' })
  async revokePlanSeat(@Req() req: any, @Param('userId') targetUserId: string) {
    const userId = req.user.id || req.user.sub;
    return this.companyService.revokePlanSeat(userId, targetUserId);
  }
}
