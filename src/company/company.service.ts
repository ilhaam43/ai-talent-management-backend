import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private async getEmployeeCompany(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException('HR Employee profile not found for this user.');
    }

    if (!employee.company) {
      // Create default company profile if missing
      const company = await this.prisma.company.create({
        data: {
          name: 'Your Company',
        },
      });
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { companyId: company.id },
      });
      return company;
    }

    return employee.company;
  }

  async getCompanyConfig(userId: string) {
    const company = await this.getEmployeeCompany(userId);
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  async updateCompanyConfig(userId: string, dto: UpdateCompanyDto) {
    const company = await this.getEmployeeCompany(userId);

    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      logoUrl: updated.logoUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async uploadCompanyLogo(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }

    const company = await this.getEmployeeCompany(userId);

    // Build object key for MinIO
    const key = this.storageService.buildCompanyLogoKey(company.id, file.originalname);
    const bucket = this.storageService.getCompanyLogoBucket();

    // Upload buffer to MinIO bucket aitm-company-logo
    await this.storageService.uploadBuffer(key, file.buffer, file.mimetype, bucket);

    // Get public URL
    const logoUrl = this.storageService.getCompanyLogoPublicUrl(key);

    // Save logoUrl to DB
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: { logoUrl },
    });

    return {
      message: 'Company logo uploaded successfully',
      company: {
        id: updated.id,
        name: updated.name,
        logoUrl: updated.logoUrl,
      },
    };
  }
}
