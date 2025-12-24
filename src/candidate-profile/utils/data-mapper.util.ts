// Enum types removed from schema except FamilyStatus (still used for CandidateFamily)
import { FamilyStatus } from '@prisma/client';
/**
 * Parse various date formats to Date object
 * Supports: DD/MM/YYYY, YYYY-MM-DD, "August 2017", "2017", etc.
 */
export function parseDate(dateString?: string | number | null): Date | null {
  if (!dateString && dateString !== 0) return null;

  // Convert to string if it's a number
  const trimmed = String(dateString).trim();

  // Try ISO format (YYYY-MM-DD)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(trimmed);
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try MM/YYYY or MM-YYYY (e.g., "05/2025", "08-2023")
  const mmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmyyyyMatch) {
    const [, month, year] = mmyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  }

  // Try "Month Year" format (e.g., "August 2017", "Jan 2020")
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, monthName, year] = monthYearMatch;
    const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
    if (monthIndex >= 0) {
      return new Date(parseInt(year), monthIndex, 1);
    }
  }

  // Try year only (e.g., "2017")
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), 0, 1); // January 1st of that year
  }

  // Try parsing as-is
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Map string to JobType string
 */
export function mapJobType(jobTypeString?: string | null): string {
  if (!jobTypeString) return 'FULL_TIME';

  const normalized = jobTypeString.toUpperCase().replace(/[^A-Z]/g, '_');
  
  if (normalized.includes('FULL_TIME') || normalized.includes('FULLTIME')) {
    return 'FULL_TIME';
  }
  if (normalized.includes('PART_TIME') || normalized.includes('PARTTIME')) {
    return 'PART_TIME';
  }
  if (normalized.includes('CONTRACT')) {
    return 'CONTRACT';
  }
  if (normalized.includes('INTERN') || normalized.includes('INTERNSHIP')) {
    return 'INTERNSHIP';
  }
  if (normalized.includes('FREELANCE')) {
    return 'FREELANCE';
  }

  return 'FULL_TIME'; // Default
}

/**
 * Map string to FieldOfWork string
 */
export function mapFieldOfWork(fieldString?: string | null): string {
  if (!fieldString) return 'OTHER';

  const normalized = fieldString.toUpperCase();
  
  if (normalized.includes('IT') || normalized.includes('TECHNOLOGY') || normalized.includes('SOFTWARE')) {
    return 'IT';
  }
  if (normalized.includes('FINANCE') || normalized.includes('FINANCIAL')) {
    return 'FINANCE';
  }
  if (normalized.includes('MARKETING')) {
    return 'MARKETING';
  }
  if (normalized.includes('HR') || normalized.includes('HUMAN_RESOURCE')) {
    return 'HR';
  }
  if (normalized.includes('SALES')) {
    return 'SALES';
  }
  if (normalized.includes('OPERATION')) {
    return 'OPERATIONS';
  }

  return 'OTHER';
}

/**
 * Map string to Industry string
 */
export function mapIndustry(industryString?: string | null): string {
  if (!industryString) return 'OTHER';

  const normalized = industryString.toUpperCase();
  
  if (normalized.includes('TECH') || normalized.includes('TECHNOLOGY') || normalized.includes('IT')) {
    return 'TECHNOLOGY';
  }
  if (normalized.includes('FINANCE') || normalized.includes('BANKING')) {
    return 'FINANCE';
  }
  if (normalized.includes('HEALTH') || normalized.includes('MEDICAL')) {
    return 'HEALTHCARE';
  }
  if (normalized.includes('EDUCATION') || normalized.includes('SCHOOL') || normalized.includes('UNIVERSITY')) {
    return 'EDUCATION';
  }
  if (normalized.includes('MANUFACTURING') || normalized.includes('PRODUCTION')) {
    return 'MANUFACTURING';
  }
  if (normalized.includes('RETAIL') || normalized.includes('SHOPPING')) {
    return 'RETAIL';
  }
  if (normalized.includes('CONSULTING') || normalized.includes('CONSULTANT')) {
    return 'CONSULTING';
  }

  return 'OTHER';
}

/**
 * Map string to Country string
 */
export function mapCountry(countryString?: string | null): string {
  if (!countryString) return 'INDONESIA'; // Default to Indonesia

  const normalized = countryString.toUpperCase();
  
  if (normalized.includes('INDONESIA') || normalized.includes('IDN')) {
    return 'INDONESIA';
  }
  if (normalized.includes('SINGAPORE') || normalized.includes('SGP')) {
    return 'SINGAPORE';
  }
  if (normalized.includes('MALAYSIA') || normalized.includes('MYS')) {
    return 'MALAYSIA';
  }
  if (normalized.includes('THAILAND') || normalized.includes('THA')) {
    return 'THAILAND';
  }
  if (normalized.includes('PHILIPPINES') || normalized.includes('PHL')) {
    return 'PHILIPPINES';
  }

  return 'OTHER';
}

/**
 * Map string to Relationship string
 */
export function mapRelationship(relationshipString?: string | null): string {
  if (!relationshipString) return 'OTHER';

  const normalized = relationshipString.toUpperCase();
  
  if (normalized.includes('COLLEAGUE') || normalized.includes('COWORKER')) {
    return 'COLLEAGUE';
  }
  if (normalized.includes('MANAGER') || normalized.includes('SUPERVISOR')) {
    return 'MANAGER';
  }
  if (normalized.includes('SUBORDINATE') || normalized.includes('TEAM_MEMBER')) {
    return 'SUBORDINATE';
  }
  if (normalized.includes('CLIENT')) {
    return 'CLIENT';
  }

  return 'OTHER';
}


/**
 * Map string to FamilyStatus enum (still used in schema)
 */
export function mapFamilyStatus(statusString?: string | null): FamilyStatus | null {
  if (!statusString) return null;

  const normalized = statusString.toUpperCase();
  
  if (normalized.includes('FATHER') || normalized.includes('DAD')) {
    return FamilyStatus.FATHER;
  }
  if (normalized.includes('MOTHER') || normalized.includes('MOM')) {
    return FamilyStatus.MOTHER;
  }
  if (normalized.includes('SPOUSE') || normalized.includes('WIFE') || normalized.includes('HUSBAND')) {
    return FamilyStatus.SPOUSE;
  }
  if (normalized.includes('CHILD') || normalized.includes('SON') || normalized.includes('DAUGHTER')) {
    return FamilyStatus.CHILD;
  }
  if (normalized.includes('SIBLING') || normalized.includes('BROTHER') || normalized.includes('SISTER')) {
    return FamilyStatus.SIBLING;
  }

  return FamilyStatus.OTHER;
}

/**
 * Map string to CandidateRating string
 */
export function mapCandidateRating(ratingString?: string | null): string {
  if (!ratingString) return '3'; // Default

  const normalized = ratingString.toUpperCase();
  
  if (normalized.includes('ONE') || normalized === '1' || normalized.includes('BEGINNER')) {
    return '1';
  }
  if (normalized.includes('TWO') || normalized === '2' || normalized.includes('BASIC')) {
    return '2';
  }
  if (normalized.includes('THREE') || normalized === '3' || normalized.includes('INTERMEDIATE')) {
    return '3';
  }
  if (normalized.includes('FOUR') || normalized === '4' || normalized.includes('ADVANCED')) {
    return '4';
  }
  if (normalized.includes('FIVE') || normalized === '5' || normalized.includes('EXPERT')) {
    return '5';
  }

  return '3'; // Default
}

/**
 * Normalize education level string
 */
export function normalizeEducationLevel(level?: string | null): string {
  if (!level) return '';

  const normalized = level.toUpperCase();
  
  // Map common variations
  if (normalized.includes('BACHELOR') || normalized.includes('S1') || normalized.includes('SARJANA')) {
    return 'Bachelor';
  }
  if (normalized.includes('MASTER') || normalized.includes('S2') || normalized.includes('MAGISTER')) {
    return 'Master';
  }
  if (normalized.includes('DOCTORATE') || normalized.includes('PHD') || normalized.includes('S3') || normalized.includes('DOKTOR')) {
    return 'PhD';
  }
  if (normalized.includes('DIPLOMA') || normalized.includes('D3') || normalized.includes('D4')) {
    return 'Diploma';
  }
  if (normalized.includes('HIGH_SCHOOL') || normalized.includes('SMA') || normalized.includes('SMK')) {
    return 'High School';
  }

  return level; // Return as-is if no match
}
