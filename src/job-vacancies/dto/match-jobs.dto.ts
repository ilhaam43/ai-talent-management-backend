import { ApiProperty } from '@nestjs/swagger';

export class MatchJobsCriteriaDto {
  @ApiProperty({
    description: 'List of division/department names to filter jobs',
    example: ['Cloud', 'Engineering'],
    required: false,
    type: [String],
  })
  divisions?: string[];

  @ApiProperty({
    description: 'Employment type ID (UUID)',
    example: '352c063d-f22d-4959-8c96-1a81f06d9ff7',
    required: false,
  })
  employmentTypeId?: string;
}

export class MatchedJobDto {
  @ApiProperty({ description: 'Job Vacancy ID', example: '1ba77961-7a1e-4dfb-a54a-4add7e7ea8f2' })
  job_id!: string;

  @ApiProperty({ description: 'Job title', example: 'Cloud Engineer' })
  job_title!: string;

  @ApiProperty({ description: 'Department name', example: 'Cloud' })
  department!: string;

  @ApiProperty({ description: 'Work location', example: 'Jakarta' })
  location!: string;

  @ApiProperty({ description: 'Employment type', example: 'Full-time' })
  employment_type!: string;

  @ApiProperty({ description: 'Job description' })
  description!: string;

  @ApiProperty({ description: 'Required qualifications' })
  qualifications!: string;

  @ApiProperty({ description: 'Minimum salary', example: '15000000' })
  min_salary!: string;

  @ApiProperty({ description: 'Maximum salary', example: '25000000' })
  max_salary!: string;
}
