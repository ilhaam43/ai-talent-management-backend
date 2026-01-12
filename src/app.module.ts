import { UsersModule } from './users/users.module'
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, UsersModule, AuthModule]
})
export class AppModule {}