import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CVParserService } from './cv-parser.service';
import { multerConfig } from '../documents/config/multer.config';
import { PrismaService } from '../database/prisma.service';

@ApiTags('cv-parser')
@Controller('cv-parser')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CVParserController {
  constructor(
    private readonly cvParserService: CVParserService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get candidate ID from user ID
   */
  private async getCandidateIdFromUserId(userId: string): Promise<string> {
    const candidate = await this.prisma.candidate.findFirst({
      where: { userId },
    });
    if (!candidate) {
      throw new UnauthorizedException('Candidate profile not found for this user');
    }
    return candidate.id;
  }

  @Post('parse/:documentId')
  @ApiOperation({ summary: 'Parse CV by document ID' })
  @ApiResponse({
    status: 200,
    description: 'CV parsed successfully',
    schema: {
      type: 'object',
      properties: {
        extractedText: { type: 'string' },
        parsedData: {
          type: 'object',
          properties: {
            personalInfo: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                dateOfBirth: { type: 'string' },
                placeOfBirth: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                idCardNumber: { type: 'string' },
              },
            },
            education: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  institution: { type: 'string' },
                  degree: { type: 'string' },
                  major: { type: 'string' },
                  gpa: { type: 'string' },
                  startYear: { type: 'string' },
                  endYear: { type: 'string' },
                },
              },
            },
            workExperience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company: { type: 'string' },
                  position: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
            organizationExperience: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  organization: { type: 'string' },
                  role: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
            },
            certifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  issuer: { type: 'string' },
                  startDate: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Failed to parse document' })
  async parseDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    console.log('parseDocument user payload:', req.user);
    if (!userId) {
      throw new UnauthorizedException('User ID missing in token');
    }
    const candidateId = await this.getCandidateIdFromUserId(userId);
    return this.cvParserService.parseDocument(documentId, candidateId);
  }

  @Post('parse-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Parse CV from uploaded file directly (without storing)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CV file (PDF, DOC, DOCX)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CV parsed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parsing failed' })
  async parseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.cvParserService.parseFile(file);
  }
}


