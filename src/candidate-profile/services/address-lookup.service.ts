import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AddressLookupService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find or create Province (for geo reference table, not for CandidateAddress)
   */
  async findOrCreateProvince(name?: string | null): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    const province = await this.prisma.province.findFirst({
      where: { province: { equals: normalized, mode: 'insensitive' } },
    });

    if (province) {
      return province.id;
    }

    // Create if not found
    const newProvince = await this.prisma.province.create({
      data: { province: normalized },
    });

    return newProvince.id;
  }

  /**
   * Find or create City (for geo reference table)
   */
  async findOrCreateCity(provinceId: string | null, cityName?: string | null): Promise<string | null> {
    if (!cityName || !provinceId) return null;

    const normalized = cityName.trim();
    if (!normalized) return null;

    const city = await this.prisma.city.findFirst({
      where: {
        provinceId: provinceId,
        city: { equals: normalized, mode: 'insensitive' },
      },
    });

    if (city) {
      return city.id;
    }

    // Create if not found
    const newCity = await this.prisma.city.create({
      data: {
        provinceId: provinceId,
        city: normalized,
      },
    });

    return newCity.id;
  }

  /**
   * Find or create Subdistrict (for geo reference table)
   */
  async findOrCreateSubdistrict(cityId: string | null, subdistrictName?: string | null): Promise<string | null> {
    if (!subdistrictName || !cityId) return null;

    const normalized = subdistrictName.trim();
    if (!normalized) return null;

    const subdistrict = await this.prisma.subdistrict.findFirst({
      where: {
        cityId: cityId,
        subdistrict: { equals: normalized, mode: 'insensitive' },
      },
    });

    if (subdistrict) {
      return subdistrict.id;
    }

    // Create if not found
    const newSubdistrict = await this.prisma.subdistrict.create({
      data: {
        cityId: cityId,
        subdistrict: normalized,
      },
    });

    return newSubdistrict.id;
  }

  /**
   * Find or create Postal Code (for geo reference table)
   */
  async findOrCreatePostalCode(subdistrictId: string | null, postalCodeValue?: string | null): Promise<string | null> {
    if (!postalCodeValue || !subdistrictId) return null;

    const normalized = postalCodeValue.trim();
    if (!normalized) return null;

    const postal = await this.prisma.postalCode.findFirst({
      where: {
        subdistrictId: subdistrictId,
        postalCode: normalized,
      },
    });

    if (postal) {
      return postal.id;
    }

    // Create if not found
    const newPostal = await this.prisma.postalCode.create({
      data: {
        subdistrictId: subdistrictId,
        postalCode: normalized,
      },
    });

    return newPostal.id;
  }

  /**
   * Store or update candidate address
   * New schema: CandidateAddress stores plain strings, not relation IDs
   */
  async storeAddress(
    userId: string,
    addressData: {
      province?: string | null;
      city?: string | null;
      subdistrict?: string | null;
      postalCode?: string | null;
      address?: string | null;
    },
    isCurrent: boolean,
    tx?: any,
  ): Promise<string | null> {
    const prisma = tx || this.prisma;
    
    const { province, city, subdistrict, postalCode, address } = addressData;
    
    // All fields are required in the new schema
    if (!province || !city || !subdistrict || !postalCode) {
      console.log('Skipping address storage: required fields missing (province, city, subdistrict, postalCode)');
      return null;
    }

    // New schema stores plain strings directly
    const addressRecord = {
      userId,
      province: province.trim(),
      city: city.trim(),
      subdistrict: subdistrict.trim(),
      postalCode: postalCode.trim(),
      candidateAddress: address?.trim() || '',
    };

    if (isCurrent) {
      const created = await prisma.candidateCurrentAddress.create({
        data: addressRecord,
      });
      return created.id;
    } else {
      const created = await prisma.candidateAddress.create({
        data: addressRecord,
      });
      return created.id;
    }
  }
}
