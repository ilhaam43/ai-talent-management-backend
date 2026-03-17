import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from "@nestjs/swagger";
import { CandidateProfileService } from "./candidate-profile.service";
import { PrismaService } from "../database/prisma.service";
import {
  StoreParsedDataDto,
  StorePersonalInfoDto,
  StoreAddressDto,
  StoreEducationDto,
  StoreWorkExperienceDto,
  StoreOrganizationExperienceDto,
  StoreSkillsDto,
  StoreCertificationsDto,
  StoreSocialMediaDto,
} from "./dto/store-parsed-data.dto";

@ApiTags("candidate-profile")
@Controller("candidate-profile")
@UseGuards(AuthGuard("jwt"))
@ApiBearerAuth()
export class CandidateProfileController {
  constructor(
    private readonly candidateProfileService: CandidateProfileService,
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
      throw new BadRequestException(
        "Candidate profile not found for this user",
      );
    }
    return candidate.id;
  }

  @Post("store-parsed-data")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store all parsed CV data to database" })
  @ApiResponse({ status: 200, description: "Data stored successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Candidate not found" })
  async storeParsedData(@Req() req: any, @Body() dto: StoreParsedDataDto) {
    console.log(
      "🚀 storeParsedData endpoint called at",
      new Date().toISOString(),
    );

    try {
      console.log("DTO.parsedData:", dto?.parsedData);

      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedException("User not authenticated");
      }

      const candidateId = await this.getCandidateIdFromUserId(userId);

      // Call service with actual parsed data
      console.log("About to call service with candidateId:", candidateId);
      const results = await this.candidateProfileService.storeParsedData(
        candidateId,
        dto.parsedData,
      );
      console.log("Service call completed with results:", results);

      return {
        success: true,
        message: "Candidate profile data stored successfully",
        data: results,
      };
    } catch (error: any) {
      console.error("storeParsedData error:", error.message);
      throw error;
    }
  }

  @Post("personal-info")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store personal information" })
  @ApiResponse({
    status: 200,
    description: "Personal info stored successfully",
  })
  async storePersonalInfo(@Req() req: any, @Body() dto: StorePersonalInfoDto) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const result = await this.candidateProfileService.storePersonalInfo(
      candidateId,
      dto,
    );
    return {
      success: true,
      message: "Personal information stored successfully",
      data: result,
    };
  }

  @Post("address")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store address" })
  @ApiResponse({ status: 200, description: "Address stored successfully" })
  async storeAddress(@Req() req: any, @Body() dto: StoreAddressDto) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const result = await this.candidateProfileService.storeAddress(
      candidateId,
      dto,
      dto.isCurrent || false,
    );
    return {
      success: true,
      message: "Address stored successfully",
      data: result,
    };
  }

  @Post("education")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store education history" })
  @ApiResponse({ status: 200, description: "Education stored successfully" })
  async storeEducation(@Req() req: any, @Body() dto: StoreEducationDto) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const results = await this.candidateProfileService.storeEducation(
      candidateId,
      dto.education,
    );
    return {
      success: true,
      message: "Education history stored successfully",
      data: results,
    };
  }

  @Post("work-experience")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store work experience" })
  @ApiResponse({
    status: 200,
    description: "Work experience stored successfully",
  })
  async storeWorkExperience(
    @Req() req: any,
    @Body() dto: StoreWorkExperienceDto,
  ) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const results = await this.candidateProfileService.storeWorkExperience(
      candidateId,
      dto.workExperience,
    );
    return {
      success: true,
      message: "Work experience stored successfully",
      data: results,
    };
  }

  @Post("organization-experience")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store organization experience" })
  @ApiResponse({
    status: 200,
    description: "Organization experience stored successfully",
  })
  async storeOrganizationExperience(
    @Req() req: any,
    @Body() dto: StoreOrganizationExperienceDto,
  ) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const results =
      await this.candidateProfileService.storeOrganizationExperience(
        candidateId,
        dto.organizationExperience,
      );
    return {
      success: true,
      message: "Organization experience stored successfully",
      data: results,
    };
  }

  @Post("skills")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store skills" })
  @ApiResponse({ status: 200, description: "Skills stored successfully" })
  async storeSkills(@Req() req: any, @Body() dto: StoreSkillsDto) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    // Convert to string array
    const skills = dto.skills.map((s) => s.skill);
    const results = await this.candidateProfileService.storeSkills(
      candidateId,
      skills,
    );
    return {
      success: true,
      message: "Skills stored successfully",
      data: results,
    };
  }

  @Post("certifications")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store certifications" })
  @ApiResponse({
    status: 200,
    description: "Certifications stored successfully",
  })
  async storeCertifications(
    @Req() req: any,
    @Body() dto: StoreCertificationsDto,
  ) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const results = await this.candidateProfileService.storeCertifications(
      candidateId,
      dto.certifications,
    );
    return {
      success: true,
      message: "Certifications stored successfully",
      data: results,
    };
  }

  @Post("social-media")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Store social media links" })
  @ApiResponse({ status: 200, description: "Social media stored successfully" })
  async storeSocialMedia(@Req() req: any, @Body() dto: StoreSocialMediaDto) {
    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);
    const results = await this.candidateProfileService.storeSocialMedia(
      candidateId,
      dto,
    );
    return {
      success: true,
      message: "Social media stored successfully",
      data: results,
    };
  }
  @Post("upload-photo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Upload profile photo" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 200, description: "Photo uploaded successfully" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const destPath = "./uploads/documents/photos";
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          callback(null, destPath);
        },
        filename: (req, file, callback) => {
          const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new BadRequestException("Only JPG, PNG, and WebP images are allowed"),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadPhoto(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const userId = req.user.id;
    const candidateId = await this.getCandidateIdFromUserId(userId);

    // Build the relative path for serving
    const photoUrl = `uploads/documents/photos/${file.filename}`;

    // Update the candidate's profilePhotoUrl
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { profilePhotoUrl: photoUrl },
    });

    return {
      success: true,
      message: "Profile photo uploaded successfully",
      data: { profilePhotoUrl: photoUrl },
    };
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user candidate profile" })
  @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async getProfile(@Req() req: any) {
    const userId = req.user.id;
    const profile = await this.candidateProfileService.getProfile(userId);

    if (!profile) {
      return {
        success: true,
        data: null,
        message: "No profile found for this user",
      };
    }

    return {
      success: true,
      data: profile,
    };
  }
}
