import { Module } from '@nestjs/common';
import { CandidateProfileService } from './candidate-profile.service';
import { CandidateProfileController } from './candidate-profile.controller';
import { DatabaseModule } from '../database/database.module';
import { ReferenceDataService } from './services/reference-data.service';
import { AddressLookupService } from './services/address-lookup.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CandidateProfileController],
  providers: [CandidateProfileService, ReferenceDataService, AddressLookupService],
  exports: [CandidateProfileService],
})
export class CandidateProfileModule {}


