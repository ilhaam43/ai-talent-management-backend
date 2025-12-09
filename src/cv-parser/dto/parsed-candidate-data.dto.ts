export interface PersonalInfo {
  fullName?: string;
  idCardNumber?: string;
  phone?: string;
  gender?: string;
  maritalStatus?: string;
  placeOfBirth?: string;
  nickname?: string;
  email?: string;
  nationality?: string;
  religion?: string;
  dateOfBirth?: string;
}

export interface SocialMedia {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface Address {
  province?: string;
  city?: string; // city/district
  subdistrict?: string;
  postalCode?: string;
}

export interface Education {
  educationLevel?: string; // e.g., "Bachelor", "Master", "High School"
  major?: string; // field of study
  country?: string;
  city?: string;
  university?: string; // institution
  gpa?: string;
  gpaMax?: string; // maxGpa
  yearOfStudy?: string; // startYear and endYear combined or just year
  startYear?: string;
  endYear?: string;
  // Legacy fields for backward compatibility
  institution?: string;
  degree?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  jobType?: string;
  fieldOfWork?: string;
  industry?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  country?: string;
  reasonForResignation?: string;
  benefit?: string;
  referenceName?: string;
  referencePhone?: string;
  referenceRelationship?: string;
}

export interface OrganizationExperience {
  organization: string;
  role: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  location?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ParsedCandidateData {
  extractedText: string;
  parsedData: {
    personalInfo: PersonalInfo;
    socialMedia?: SocialMedia;
    address?: Address;
    education: Education[];
    workExperience: WorkExperience[];
    organizationExperience: OrganizationExperience[];
    skills: string[];
    certifications: Certification[];
  };
}


