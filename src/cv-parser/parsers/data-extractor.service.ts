import { Injectable } from '@nestjs/common';
import {
  PersonalInfo,
  Education,
  WorkExperience,
  OrganizationExperience,
  Certification,
} from '../dto/parsed-candidate-data.dto';

@Injectable()
export class DataExtractorService {
  /**
   * Extract personal information from CV text
   */
  extractPersonalInfo(text: string): PersonalInfo {
    const personalInfo: PersonalInfo = {};

    // Extract email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }

    // Extract phone (various formats)
    const phoneMatch = text.match(
      /(?:\+?62|0)[\s-]?(?:\d{2,3})[\s-]?\d{3,4}[\s-]?\d{3,4}|\+?\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/,
    );
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();
    }

    // Extract name (look for common patterns)
    const namePatterns = [
      /(?:name|nama)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/m,
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        personalInfo.fullName = match[1].trim();
        break;
      }
    }

    // Extract date of birth
    const dobMatch = text.match(
      /(?:date of birth|birth date|dob|tanggal lahir|lahir)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    );
    if (dobMatch) {
      personalInfo.dateOfBirth = dobMatch[1];
    }

    // Extract place of birth
    const pobMatch = text.match(
      /(?:place of birth|tempat lahir|born in)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i,
    );
    if (pobMatch) {
      personalInfo.placeOfBirth = pobMatch[1].trim();
    }

    // Extract ID card number (KTP)
    const idMatch = text.match(
      /(?:ktp|nik|id card|identification number)\s*:?\s*(\d{16})/i,
    );
    if (idMatch) {
      personalInfo.idCardNumber = idMatch[1];
    }

    // Extract address
    const addressMatch = text.match(
      /(?:address|alamat)\s*:?\s*([^\n]{20,150})/i,
    );
    if (addressMatch) {
      personalInfo.address = addressMatch[1].trim();
    }

    // Extract city/domicile
    const cityMatch = text.match(
      /(?:city|domicile|kota|domisili)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i,
    );
    if (cityMatch) {
      personalInfo.city = cityMatch[1].trim();
    }

    return personalInfo;
  }

  /**
   * Extract education history from CV text
   */
  extractEducation(text: string): Education[] {
    const educations: Education[] = [];
    
    // Find education section
    const educationSectionMatch = text.match(
      /(?:education|pendidikan|academic|riwayat pendidikan)([\s\S]*?)(?=\n(?:experience|work|skill|organization|certification|proyect|interest|reference)|$)/i,
    );
    
    if (!educationSectionMatch) {
      return educations;
    }

    const educationText = educationSectionMatch[1];

    // Common degree patterns
    const degreePatterns = [
      /(?:Bachelor|Master|PhD|Diploma|S1|S2|S3|D3|D4|Sarjana|Magister|Doktor)/gi,
    ];

    // Extract institution and degree
    const institutionMatches = educationText.matchAll(
      /(?:university|institut|college|universitas|sekolah|academy|akademi)\s+([^\n]{5,100})/gi,
    );

    for (const match of institutionMatches) {
      const context = educationText.slice(
        Math.max(0, match.index! - 200),
        Math.min(educationText.length, match.index! + 300),
      );

      const education: Education = {
        institution: match[1].trim().split('\n')[0].trim(),
        degree: 'Bachelor', // Default
      };

      // Find degree
      for (const pattern of degreePatterns) {
        const degreeMatch = context.match(pattern);
        if (degreeMatch) {
          education.degree = degreeMatch[0];
          break;
        }
      }

      // Find major
      const majorMatch = context.match(
        /(?:major|jurusan|program studi|field of study)\s*:?\s*([^\n]{5,80})/i,
      );
      if (majorMatch) {
        education.major = majorMatch[1].trim();
      }

      // Find GPA
      const gpaMatch = context.match(/(?:gpa|ipk)\s*:?\s*(\d+\.?\d*)\s*(?:\/|of|dari)?\s*(\d+\.?\d*)?/i);
      if (gpaMatch) {
        education.gpa = gpaMatch[1];
        if (gpaMatch[2]) {
          education.maxGpa = gpaMatch[2];
        }
      }

      // Find years (various formats)
      const yearMatch = context.match(/(\d{4})\s*[-–—to]+\s*(\d{4}|present|now|sekarang)/i);
      if (yearMatch) {
        education.startYear = yearMatch[1];
        education.endYear = yearMatch[2].match(/\d{4}/) ? yearMatch[2] : new Date().getFullYear().toString();
      }

      educations.push(education);
    }

    return educations;
  }

  /**
   * Extract work experience from CV text
   */
  extractWorkExperience(text: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];

    // Find work experience section
    const experienceSectionMatch = text.match(
      /(?:work experience|professional experience|employment|pengalaman kerja|riwayat pekerjaan)([\s\S]*?)(?=\n(?:education|skill|organization|certification|proyect|interest|reference)|$)/i,
    );

    if (!experienceSectionMatch) {
      return experiences;
    }

    const experienceText = experienceSectionMatch[1];

    // Split by common separators (years, company patterns)
    const experienceBlocks = experienceText.split(/\n(?=\d{4}|\w+\s+\d{4})/);

    for (const block of experienceBlocks) {
      if (block.trim().length < 20) continue;

      const experience: WorkExperience = {
        company: '',
        position: '',
      };

      // Extract company name (often in bold or first line)
      const companyMatch = block.match(/^([A-Z][^\n]{5,80})/);
      if (companyMatch) {
        const firstLine = companyMatch[1].trim();
        // Check if it's likely a company (not a position)
        if (
          !/(?:manager|engineer|developer|analyst|director|specialist)/i.test(
            firstLine,
          )
        ) {
          experience.company = firstLine;
        }
      }

      // Extract position
      const positionMatch = block.match(
        /(?:as\s+)?(?:position|role|jabatan)?\s*:?\s*([A-Z][^\n]{5,80})/i,
      );
      if (positionMatch) {
        experience.position = positionMatch[1].trim();
      } else {
        // Try to find common job titles
        const titleMatch = block.match(
          /(software engineer|developer|manager|analyst|designer|consultant|director|specialist|staff|officer|coordinator)[^\n]*/i,
        );
        if (titleMatch) {
          experience.position = titleMatch[0].trim();
        }
      }

      // Extract dates
      const dateMatch = block.match(
        /(\w+\s+\d{4}|\d{4}[-/]\d{1,2}|\d{1,2}[-/]\d{4})\s*[-–—to]+\s*(\w+\s+\d{4}|\d{4}[-/]\d{1,2}|\d{1,2}[-/]\d{4}|present|now|sekarang)/i,
      );
      if (dateMatch) {
        experience.startDate = dateMatch[1].trim();
        experience.endDate = dateMatch[2].trim();
      }

      // Extract description (remaining text)
      const descLines = block.split('\n').slice(2).filter(line => line.trim().length > 10);
      if (descLines.length > 0) {
        experience.description = descLines.join(' ').trim().slice(0, 500);
      }

      // Only add if we have at least company or position
      if (experience.company || experience.position) {
        experiences.push(experience);
      }
    }

    return experiences;
  }

  /**
   * Extract organization experience from CV text
   */
  extractOrganizationExperience(text: string): OrganizationExperience[] {
    const organizations: OrganizationExperience[] = [];

    // Find organization section
    const orgSectionMatch = text.match(
      /(?:organization|volunteer|community|extracurricular|organisasi|kegiatan)([\s\S]*?)(?=\n(?:education|work|skill|certification|proyect|interest|reference)|$)/i,
    );

    if (!orgSectionMatch) {
      return organizations;
    }

    const orgText = orgSectionMatch[1];
    const orgBlocks = orgText.split(/\n(?=\d{4}|\w+\s+\d{4})/);

    for (const block of orgBlocks) {
      if (block.trim().length < 15) continue;

      const org: OrganizationExperience = {
        organization: '',
        role: '',
      };

      // Extract organization name
      const orgMatch = block.match(/^([A-Z][^\n]{5,100})/);
      if (orgMatch) {
        org.organization = orgMatch[1].trim();
      }

      // Extract role
      const roleMatch = block.match(
        /(?:as\s+)?(?:role|position|jabatan)?\s*:?\s*([A-Z][^\n]{5,80})/i,
      );
      if (roleMatch) {
        org.role = roleMatch[1].trim();
      } else {
        const titleMatch = block.match(
          /(president|vice|chairman|ketua|wakil|secretary|treasurer|member|koordinator|staff)[^\n]*/i,
        );
        if (titleMatch) {
          org.role = titleMatch[0].trim();
        }
      }

      // Extract dates
      const dateMatch = block.match(
        /(\d{4}|\w+\s+\d{4})\s*[-–—to]+\s*(\d{4}|\w+\s+\d{4}|present|now|sekarang)/i,
      );
      if (dateMatch) {
        org.startDate = dateMatch[1].trim();
        org.endDate = dateMatch[2].trim();
      }

      // Extract description
      const descLines = block.split('\n').slice(1).filter(line => line.trim().length > 10);
      if (descLines.length > 0) {
        org.description = descLines.join(' ').trim().slice(0, 300);
      }

      if (org.organization || org.role) {
        organizations.push(org);
      }
    }

    return organizations;
  }

  /**
   * Extract skills from CV text
   */
  extractSkills(text: string): string[] {
    const skills: string[] = [];

    // Find skills section
    const skillsSectionMatch = text.match(
      /(?:skills?|expertise|competenc|keahlian|kemampuan)([\s\S]*?)(?=\n(?:education|work|experience|organization|certification|proyect|interest|reference)|$)/i,
    );

    if (!skillsSectionMatch) {
      return skills;
    }

    const skillsText = skillsSectionMatch[1];

    // Split by common separators
    const skillsList = skillsText
      .split(/[,;\n•·\-–]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 50)
      .filter(s => !/^(?:skill|expertise|technical|soft)/i.test(s))
      .slice(0, 30); // Limit to 30 skills

    return [...new Set(skillsList)]; // Remove duplicates
  }

  /**
   * Extract certifications from CV text
   */
  extractCertifications(text: string): Certification[] {
    const certifications: Certification[] = [];

    // Find certification section
    const certSectionMatch = text.match(
      /(?:certification|certificate|training|course|sertifikat|pelatihan)([\s\S]*?)(?=\n(?:education|work|experience|organization|skill|proyect|interest|reference)|$)/i,
    );

    if (!certSectionMatch) {
      return certifications;
    }

    const certText = certSectionMatch[1];
    const certBlocks = certText.split(/\n(?=[A-Z])/);

    for (const block of certBlocks) {
      if (block.trim().length < 10) continue;

      const cert: Certification = {
        name: '',
      };

      // Extract certification name (usually first line)
      const nameMatch = block.match(/^([^\n]{10,150})/);
      if (nameMatch) {
        cert.name = nameMatch[1].trim();
      }

      // Extract issuer
      const issuerMatch = block.match(
        /(?:issued by|from|by|oleh|dari)\s+([A-Z][^\n]{5,100})/i,
      );
      if (issuerMatch) {
        cert.issuer = issuerMatch[1].trim();
      }

      // Extract date
      const dateMatch = block.match(/(\w+\s+\d{4}|\d{4})/);
      if (dateMatch) {
        cert.startDate = dateMatch[1];
      }

      if (cert.name) {
        certifications.push(cert);
      }
    }

    return certifications;
  }
}


