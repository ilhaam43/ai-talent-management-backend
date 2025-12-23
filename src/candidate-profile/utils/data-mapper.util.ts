import {
  JobType,
  FieldOfWork,
  Industry,
  Country,
  Relationship,
  FamilyStatus,
  CandidateRating,
} from '@prisma/client';

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
 * Map string to JobType enum
 */
export function mapJobType(jobTypeString?: string | null): JobType {
  if (!jobTypeString) return JobType.FULL_TIME;

  const normalized = jobTypeString.toUpperCase().replace(/[^A-Z]/g, '_');
  
  if (normalized.includes('FULL_TIME') || normalized.includes('FULLTIME')) {
    return JobType.FULL_TIME;
  }
  if (normalized.includes('PART_TIME') || normalized.includes('PARTTIME')) {
    return JobType.PART_TIME;
  }
  if (normalized.includes('CONTRACT')) {
    return JobType.CONTRACT;
  }
  if (normalized.includes('INTERN') || normalized.includes('INTERNSHIP')) {
    return JobType.INTERNSHIP;
  }
  if (normalized.includes('FREELANCE')) {
    return JobType.FREELANCE;
  }

  return JobType.FULL_TIME; // Default
}

/**
 * Map string to FieldOfWork enum
 */
export function mapFieldOfWork(fieldString?: string | null): FieldOfWork {
  if (!fieldString) return FieldOfWork.OTHER;

  const normalized = fieldString.toUpperCase();
  
  if (normalized.includes('IT') || normalized.includes('TECHNOLOGY') || normalized.includes('SOFTWARE')) {
    return FieldOfWork.IT;
  }
  if (normalized.includes('FINANCE') || normalized.includes('FINANCIAL')) {
    return FieldOfWork.FINANCE;
  }
  if (normalized.includes('MARKETING')) {
    return FieldOfWork.MARKETING;
  }
  if (normalized.includes('HR') || normalized.includes('HUMAN_RESOURCE')) {
    return FieldOfWork.HR;
  }
  if (normalized.includes('SALES')) {
    return FieldOfWork.SALES;
  }
  if (normalized.includes('OPERATION')) {
    return FieldOfWork.OPERATIONS;
  }

  return FieldOfWork.OTHER;
}

/**
 * Map string to Industry enum
 */
export function mapIndustry(industryString?: string | null): Industry {
  if (!industryString) return Industry.OTHER;

  const normalized = industryString.toUpperCase();
  
  if (normalized.includes('TECH') || normalized.includes('TECHNOLOGY') || normalized.includes('IT')) {
    return Industry.TECHNOLOGY;
  }
  if (normalized.includes('FINANCE') || normalized.includes('BANKING')) {
    return Industry.FINANCE;
  }
  if (normalized.includes('HEALTH') || normalized.includes('MEDICAL')) {
    return Industry.HEALTHCARE;
  }
  if (normalized.includes('EDUCATION') || normalized.includes('SCHOOL') || normalized.includes('UNIVERSITY')) {
    return Industry.EDUCATION;
  }
  if (normalized.includes('MANUFACTURING') || normalized.includes('PRODUCTION')) {
    return Industry.MANUFACTURING;
  }
  if (normalized.includes('RETAIL') || normalized.includes('SHOPPING')) {
    return Industry.RETAIL;
  }
  if (normalized.includes('CONSULTING') || normalized.includes('CONSULTANT')) {
    return Industry.CONSULTING;
  }

  return Industry.OTHER;
}

/**
 * Map string to Country enum
 */
export function mapCountry(countryString?: string | null): Country {
  if (!countryString) return Country.INDONESIA; // Default to Indonesia

  const normalized = countryString.toUpperCase();
  
  if (normalized.includes('INDONESIA') || normalized.includes('IDN')) {
    return Country.INDONESIA;
  }
  if (normalized.includes('SINGAPORE') || normalized.includes('SGP')) {
    return Country.SINGAPORE;
  }
  if (normalized.includes('MALAYSIA') || normalized.includes('MYS')) {
    return Country.MALAYSIA;
  }
  if (normalized.includes('THAILAND') || normalized.includes('THA')) {
    return Country.THAILAND;
  }
  if (normalized.includes('PHILIPPINES') || normalized.includes('PHL')) {
    return Country.PHILIPPINES;
  }

  return Country.OTHER;
}

/**
 * Map string to Relationship enum
 */
export function mapRelationship(relationshipString?: string | null): Relationship | null {
  if (!relationshipString) return null;

  const normalized = relationshipString.toUpperCase();
  
  if (normalized.includes('COLLEAGUE') || normalized.includes('COWORKER')) {
    return Relationship.COLLEAGUE;
  }
  if (normalized.includes('MANAGER') || normalized.includes('SUPERVISOR')) {
    return Relationship.MANAGER;
  }
  if (normalized.includes('SUBORDINATE') || normalized.includes('TEAM_MEMBER')) {
    return Relationship.SUBORDINATE;
  }
  if (normalized.includes('CLIENT')) {
    return Relationship.CLIENT;
  }

  return Relationship.OTHER;
}

/**
 * Map string to FamilyStatus enum
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
 * Map string to CandidateRating enum
 */
export function mapCandidateRating(ratingString?: string | null): CandidateRating {
  if (!ratingString) return CandidateRating.THREE; // Default

  const normalized = ratingString.toUpperCase();
  
  if (normalized.includes('ONE') || normalized === '1' || normalized.includes('BEGINNER')) {
    return CandidateRating.ONE;
  }
  if (normalized.includes('TWO') || normalized === '2' || normalized.includes('BASIC')) {
    return CandidateRating.TWO;
  }
  if (normalized.includes('THREE') || normalized === '3' || normalized.includes('INTERMEDIATE')) {
    return CandidateRating.THREE;
  }
  if (normalized.includes('FOUR') || normalized === '4' || normalized.includes('ADVANCED')) {
    return CandidateRating.FOUR;
  }
  if (normalized.includes('FIVE') || normalized === '5' || normalized.includes('EXPERT')) {
    return CandidateRating.FIVE;
  }

  return CandidateRating.THREE; // Default
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
