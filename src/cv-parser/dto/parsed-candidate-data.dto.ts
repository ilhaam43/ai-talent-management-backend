export interface PersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  address?: string;
  city?: string;
  idCardNumber?: string;
}

export interface Education {
  institution: string;
  degree: string;
  major?: string;
  gpa?: string;
  maxGpa?: string;
  startYear?: string;
  endYear?: string;
  country?: string;
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
    education: Education[];
    workExperience: WorkExperience[];
    organizationExperience: OrganizationExperience[];
    skills: string[];
    certifications: Certification[];
  };
}


