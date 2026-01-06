import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createSkillDto: CreateSkillDto) {
        // Check uniqueness if needed (Prisma unique constraint handles it, but nice to catch)
        return (this.prisma as any).skill.create({
            data: createSkillDto,
        });
    }

    async findAll() {
        return (this.prisma as any).skill.findMany({
            orderBy: { skillName: 'asc' },
        });
    }

    async findOne(id: string) {
        const skill = await (this.prisma as any).skill.findUnique({
            where: { id },
        });
        if (!skill) throw new NotFoundException(`Skill with ID ${id} not found`);
        return skill;
    }

    async update(id: string, updateSkillDto: UpdateSkillDto) {
        await this.findOne(id);
        return (this.prisma as any).skill.update({
            where: { id },
            data: updateSkillDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return (this.prisma as any).skill.delete({
            where: { id },
        });
    }
}
