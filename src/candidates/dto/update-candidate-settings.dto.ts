import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateCandidateSettingsDto {
    @ApiProperty({ required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    fullname?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;
}
