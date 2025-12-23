import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { LocalStrategy } from "./local.strategy";
import { JwtStrategy } from "./jwt.strategy";
import { AuthController } from "./auth.controller";
import { DatabaseModule } from "../database/database.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CandidatesModule } from "../candidates/candidates.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    CandidatesModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") || "supersecretjwt",
        signOptions: { expiresIn: "60m" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
