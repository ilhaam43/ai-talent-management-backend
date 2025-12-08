import { UsersModule } from './users/users.module'
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DocumentsModule } from './documents/documents.module'
import { CVParserModule } from './cv-parser/cv-parser.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    DocumentsModule,
    CVParserModule,
  ],
})
export class AppModule {}