import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
    constructor(private readonly skillsService: SkillsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new skill' })
    @ApiBody({ type: CreateSkillDto })
    @ApiResponse({ status: 201, description: 'Skill created successfully' })
    create(@Body() createSkillDto: CreateSkillDto) {
        return this.skillsService.create(createSkillDto);
    }

    @Get()
    @ApiOperation({ summary: 'List all skills' })
    @ApiResponse({ status: 200, description: 'Return all skills' })
    findAll() {
        return this.skillsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get skill by ID' })
    @ApiParam({ name: 'id', description: 'Skill ID' })
    @ApiResponse({ status: 200, description: 'Return skill details' })
    @ApiResponse({ status: 404, description: 'Skill not found' })
    findOne(@Param('id') id: string) {
        return this.skillsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a skill' })
    @ApiParam({ name: 'id', description: 'Skill ID' })
    @ApiBody({ type: UpdateSkillDto })
    @ApiResponse({ status: 200, description: 'Skill updated successfully' })
    update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
        return this.skillsService.update(id, updateSkillDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a skill' })
    @ApiParam({ name: 'id', description: 'Skill ID' })
    @ApiResponse({ status: 200, description: 'Skill deleted successfully' })
    remove(@Param('id') id: string) {
        return this.skillsService.remove(id);
    }
}
