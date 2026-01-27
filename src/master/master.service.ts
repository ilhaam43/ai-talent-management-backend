import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MasterService {
    constructor(private prisma: PrismaService) { }

    async getDocumentTypes() {
        return this.prisma.documentType.findMany({
            orderBy: { documentType: 'asc' },
        });
    }

    async getCandidateLastEducations() {
        return this.prisma.candidateLastEducation.findMany({
            // 'candidate_education' contains names like 'SMA', 'S1'. 
            // Let's just order by createdAt for now as a stable sort if no explicit order column.
            orderBy: { createdAt: 'asc' },
        });
    }

    async getReligions() {
        return this.prisma.religion.findMany();
    }

    async getMaritalStatuses() {
        return this.prisma.maritalStatus.findMany();
    }

    async getNationalities() {
        return this.prisma.nationality.findMany({
            orderBy: { nationality: 'asc' },
        });
    }

    async getGenders() {
        return this.prisma.gender.findMany();
    }

    async getJobRoles() {
        return this.prisma.jobRole.findMany({
            orderBy: { jobRoleName: 'asc' },
        });
    }

    async getDirectorates() {
        return this.prisma.directorate.findMany({
            orderBy: { directorateName: 'asc' },
        });
    }

    async getDivisions(directorateId?: string) {
        return this.prisma.division.findMany({
            where: directorateId ? { directorateId } : undefined,
            orderBy: { divisionName: 'asc' },
        });
    }

    async getDepartments(divisionId?: string) {
        return this.prisma.department.findMany({
            where: divisionId ? { divisionId } : undefined,
            orderBy: { departmentName: 'asc' },
        });
    }

    async getEmployeePositions() {
        return this.prisma.employeePosition.findMany({
            orderBy: { employeePosition: 'asc' },
        });
    }

    async getEmploymentTypes() {
        return this.prisma.employmentType.findMany({
            orderBy: { employmentType: 'asc' },
        });
    }

    async getSkills() {
        return this.prisma.skill.findMany({
            orderBy: { skillName: 'asc' },
        });
    }

    async createSkill(dto: any) {
        return this.prisma.skill.create({
            data: dto,
        });
    }

    async updateSkill(id: string, dto: any) {
        return this.prisma.skill.update({
            where: { id },
            data: dto,
        });
    }

    async createJobRole(dto: any) {
        return this.prisma.jobRole.create({
            data: dto,
        });
    }

    async updateJobRole(id: string, dto: any) {
        return this.prisma.jobRole.update({
            where: { id },
            data: dto,
        });
    }

    async getJobVacancyReasons() {
        return this.prisma.jobVacancyReason.findMany({
            orderBy: { reason: 'asc' },
        });
    }

    async getJobVacancyDurations() {
        return this.prisma.jobVacancyDuration.findMany({
            orderBy: { daysDuration: 'asc' },
        });
    }
}
