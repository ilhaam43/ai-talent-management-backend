import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns the employee record (with company) for the given user.
   * Throws if the user has no employee profile.
   */
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

  /**
   * Verifies that the userId is the HR Admin of their company.
   * Returns the company record.
   */
  private async assertHrAdmin(userId: string) {
    const company = await this.getEmployeeCompany(userId);

    if (company.hrAdminId !== userId) {
      throw new ForbiddenException('Only the HR Admin can perform this action.');
    }

    return company;
  }

  /**
   * Generates a random 12-character password with uppercase, lowercase, digits, and symbols.
   */
  private generateRandomPassword(): string {
    const length = 12;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  async getCompanyConfig(userId: string) {
    const company = await this.getEmployeeCompany(userId);
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      hrAdminId: company.hrAdminId,
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

  // ─── Company Profile (HR Admin only) ──────────────────────────────────────

  async getCompanyProfile(userId: string) {
    const company = await this.assertHrAdmin(userId);
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
      hrAdminId: company.hrAdminId,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  async updateCompanyProfile(userId: string, dto: UpdateCompanyDto) {
    const company = await this.assertHrAdmin(userId);

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

  // ─── User Management (HR Admin only) ──────────────────────────────────────

  /**
   * List all users (employees) belonging to the HR Admin's company.
   */
  async getCompanyUsers(userId: string) {
    const company = await this.assertHrAdmin(userId);

    const employees = await this.prisma.employee.findMany({
      where: { companyId: company.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isVerified: true,
            createdAt: true,
          },
        },
        userRole: {
          select: {
            id: true,
            roleName: true,
          },
        },
        employeePosition: {
          select: {
            id: true,
            employeePosition: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return employees.map((emp) => ({
      employeeId: emp.id,
      employeeIdentificationNumber: emp.employeeIdentificationNumber,
      userId: emp.user.id,
      name: emp.user.name,
      email: emp.user.email,
      isVerified: emp.user.isVerified,
      role: emp.userRole.roleName,
      roleId: emp.userRole.id,
      position: emp.employeePosition.employeePosition,
      positionId: emp.employeePosition.id,
      createdAt: emp.createdAt,
    }));
  }

  /**
   * Create a new user and employee record in the HR Admin's company.
   * No email verification required — the HR Admin creates users directly.
   */
  async createCompanyUser(userId: string, dto: CreateCompanyUserDto) {
    const company = await this.assertHrAdmin(userId);

    // Check for duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    // Verify the role exists
    const role = await this.prisma.userRole.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new NotFoundException('User role not found.');
    }

    // Auto-generate password if not provided
    const plainPassword = dto.password || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Auto-generate EIN if not provided
    const ein =
      dto.employeeIdentificationNumber ||
      `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Create User + Employee in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashedPassword,
          isVerified: true,
          emailVerified: new Date(),
        },
      });

      // Use default OFFICER position, or first available
      const position =
        (await tx.employeePosition.findFirst({
          where: { employeePosition: 'OFFICER' },
        })) ?? (await tx.employeePosition.findFirst());

      if (!position) {
        throw new NotFoundException('No employee position found. Please seed positions first.');
      }

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          userRoleId: dto.roleId,
          employeePositionId: position.id,
          employeeIdentificationNumber: ein,
          companyId: company.id,
        },
        include: {
          userRole: { select: { roleName: true } },
        },
      });

      return { user, employee };
    });

    return {
      message: 'User created successfully',
      generatedPassword: plainPassword,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.employee.userRole.roleName,
        roleId: result.employee.userRoleId,
        employeeIdentificationNumber: result.employee.employeeIdentificationNumber,
      },
    };
  }

  /**
   * Update a user's role or name within the HR Admin's company.
   */
  async updateCompanyUserRole(userId: string, targetUserId: string, dto: UpdateCompanyUserDto) {
    const company = await this.assertHrAdmin(userId);

    // Find the target employee in this company
    const targetEmployee = await this.prisma.employee.findFirst({
      where: {
        userId: targetUserId,
        companyId: company.id,
      },
      include: { user: true },
    });

    if (!targetEmployee) {
      throw new NotFoundException('User not found in your company.');
    }

    // Prevent the admin from changing their own role
    if (targetUserId === userId && dto.roleId) {
      throw new ForbiddenException('Cannot change your own admin role.');
    }

    // Verify new role exists if provided
    if (dto.roleId) {
      const role = await this.prisma.userRole.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundException('User role not found.');
      }
    }

    // Check for duplicate EIN if changing
    if (dto.employeeIdentificationNumber) {
      const existing = await this.prisma.employee.findFirst({
        where: {
          employeeIdentificationNumber: dto.employeeIdentificationNumber,
          id: { not: targetEmployee.id },
        },
      });
      if (existing) {
        throw new ConflictException('Employee identification number already in use.');
      }
    }

    // Update user name if provided
    if (dto.name) {
      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { name: dto.name.trim() },
      });
    }

    // Update employee role / EIN
    const updatedEmployee = await this.prisma.employee.update({
      where: { id: targetEmployee.id },
      data: {
        ...(dto.roleId ? { userRoleId: dto.roleId } : {}),
        ...(dto.employeeIdentificationNumber
          ? { employeeIdentificationNumber: dto.employeeIdentificationNumber }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        userRole: { select: { id: true, roleName: true } },
      },
    });

    return {
      message: 'User updated successfully',
      user: {
        id: updatedEmployee.user.id,
        name: updatedEmployee.user.name,
        email: updatedEmployee.user.email,
        role: updatedEmployee.userRole.roleName,
        roleId: updatedEmployee.userRole.id,
        employeeIdentificationNumber: updatedEmployee.employeeIdentificationNumber,
      },
    };
  }

  /**
   * Remove a user from the HR Admin's company.
   * Deletes the employee record and the user record.
   */
  async removeCompanyUser(userId: string, targetUserId: string) {
    const company = await this.assertHrAdmin(userId);

    // Prevent admin from removing themselves
    if (targetUserId === userId) {
      throw new ForbiddenException('Cannot remove yourself as HR Admin.');
    }

    // Find the target employee in this company
    const targetEmployee = await this.prisma.employee.findFirst({
      where: {
        userId: targetUserId,
        companyId: company.id,
      },
    });

    if (!targetEmployee) {
      throw new NotFoundException('User not found in your company.');
    }

    // Delete employee first (due to FK), then user
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.delete({ where: { id: targetEmployee.id } });
      await tx.user.delete({ where: { id: targetUserId } });
    });

    return { message: 'User removed successfully' };
  }
}
