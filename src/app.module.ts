import { UsersModule } from './users/users.module'
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DocumentsModule } from './documents/documents.module'
import { CVParserModule } from './cv-parser/cv-parser.module'
import { CandidatesModule } from './candidates/candidates.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    DocumentsModule,
    CVParserModule,
    CandidatesModule,
  ],
})
export class AppModule {}