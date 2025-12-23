import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AddressLookupService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find or create Province
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
   * Find or create City
   */
  async findOrCreateCity(provinceId: string | null, cityName?: string | null): Promise<string | null> {
    if (!cityName || !provinceId) return null;

    const normalized = cityName.trim();
    if (!normalized) return null;

    const city = await this.prisma.city.findFirst({
      where: {
        provincesId: provinceId,
        cities: { equals: normalized, mode: 'insensitive' },
      },
    });

    if (city) {
      return city.id;
    }

    // Create if not found
    const newCity = await this.prisma.city.create({
      data: {
        provincesId: provinceId,
        cities: normalized,
      },
    });

    return newCity.id;
  }

  /**
   * Find or create Subdistrict
   */
  async findOrCreateSubdistrict(cityId: string | null, subdistrictName?: string | null): Promise<string | null> {
    if (!subdistrictName || !cityId) return null;

    const normalized = subdistrictName.trim();
    if (!normalized) return null;

    const subdistrict = await this.prisma.subdistrict.findFirst({
      where: {
        citiesId: cityId,
        subdistricts: { equals: normalized, mode: 'insensitive' },
      },
    });

    if (subdistrict) {
      return subdistrict.id;
    }

    // Create if not found
    const newSubdistrict = await this.prisma.subdistrict.create({
      data: {
        citiesId: cityId,
        subdistricts: normalized,
      },
    });

    return newSubdistrict.id;
  }

  /**
   * Find or create Postal Code
   */
  async findOrCreatePostalCode(subdistrictId: string | null, postalCode?: string | null): Promise<string | null> {
    if (!postalCode || !subdistrictId) return null;

    const normalized = postalCode.trim();
    if (!normalized) return null;

    const postal = await this.prisma.postalCode.findFirst({
      where: {
        subdistrictId: subdistrictId,
        postalCodes: normalized,
      },
    });

    if (postal) {
      return postal.id;
    }

    // Create if not found
    const newPostal = await this.prisma.postalCode.create({
      data: {
        subdistrictId: subdistrictId,
        postalCodes: normalized,
      },
    });

    return newPostal.id;
  }

  /**
   * Create address record with geo lookup
   */
  async createAddressRecord(
    userId: string,
    province?: string | null,
    city?: string | null,
    subdistrict?: string | null,
    postalCode?: string | null,
    address?: string | null,
    isCurrent: boolean = false,
    tx?: any,
  ): Promise<string | null> {
    const prisma = tx || this.prisma;
    
    if (!province || !city) return null;

    // Lookup geo data
    const provinceId = await this.findOrCreateProvince(province);
    if (!provinceId) return null;

    const cityId = await this.findOrCreateCity(provinceId, city);
    if (!cityId) return null;

    const subdistrictId = subdistrict ? await this.findOrCreateSubdistrict(cityId, subdistrict) : null;
    const postalCodeId = postalCode && subdistrictId ? await this.findOrCreatePostalCode(subdistrictId, postalCode) : null;

    // Schema requires subdistrictId and postalCodeId - skip if not available
    if (!subdistrictId || !postalCodeId) {
      console.log('Skipping address storage: subdistrict or postal code not available (required by schema)');
      return null;
    }

    // Create address record - use Prisma connect syntax for relations
    const baseAddressData: any = {
      user: { connect: { id: userId } },
      province: { connect: { id: provinceId } },
      city: { connect: { id: cityId } },
      candidateAddress: address || '',
    };

    // Only add optional relations if they have values
    if (subdistrictId) {
      baseAddressData.subdistrict = { connect: { id: subdistrictId } };
    }
    if (postalCodeId) {
      baseAddressData.postalCode = { connect: { id: postalCodeId } };
    }

    if (isCurrent) {
      const addressRecord = await prisma.candidateCurrentAddress.create({
        data: baseAddressData,
      });
      return addressRecord.id;
    } else {
      const addressRecord = await prisma.candidateAddress.create({
        data: baseAddressData,
      });
      return addressRecord.id;
    }
  }
}

