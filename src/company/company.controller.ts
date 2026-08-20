import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Company Configuration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

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
}
