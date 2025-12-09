import { Injectable } from '@nestjs/common';
import {
  PersonalInfo,
  SocialMedia,
  Address,
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

    // Note: Address is now extracted separately via extractAddress() method

    // Extract gender
    const genderMatch = text.match(/(?:gender|jenis kelamin)\s*:?\s*(male|female|pria|wanita|man|woman|laki-laki|perempuan)/i);
    if (genderMatch) {
      const gender = genderMatch[1].toLowerCase();
      if (gender.includes('male') || gender.includes('pria') || gender.includes('laki')) {
        personalInfo.gender = 'Male';
      } else if (gender.includes('female') || gender.includes('wanita') || gender.includes('perempuan')) {
        personalInfo.gender = 'Female';
      }
    }

    // Extract marital status
    const maritalMatch = text.match(/(?:marital status|status pernikahan|status)\s*:?\s*(single|married|divorced|widowed|belum menikah|menikah|cerai|janda|duda)/i);
    if (maritalMatch) {
      const status = maritalMatch[1].toLowerCase();
      if (status.includes('single') || status.includes('belum')) personalInfo.maritalStatus = 'Single';
      else if (status.includes('married') || status.includes('menikah')) personalInfo.maritalStatus = 'Married';
      else if (status.includes('divorced') || status.includes('cerai')) personalInfo.maritalStatus = 'Divorced';
      else if (status.includes('widowed') || status.includes('janda') || status.includes('duda')) personalInfo.maritalStatus = 'Widowed';
    }

    // Extract nickname
    const nicknameMatch = text.match(/(?:nickname|panggilan|nama panggilan|call me)\s*:?\s*([A-Za-z]+)/i);
    if (nicknameMatch) {
      personalInfo.nickname = nicknameMatch[1].trim();
    }

    // Extract nationality
    const nationalityMatch = text.match(/(?:nationality|kewarganegaraan|warga negara)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i);
    if (nationalityMatch) {
      personalInfo.nationality = nationalityMatch[1].trim();
    }

    // Extract religion
    const religionMatch = text.match(/(?:religion|agama)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i);
    if (religionMatch) {
      personalInfo.religion = religionMatch[1].trim();
    }

    return personalInfo;
  }

  /**
   * Extract social media links from CV text
   */
  extractSocialMedia(text: string): SocialMedia {
    const socialMedia: SocialMedia = {};

    // Extract LinkedIn
    const linkedinMatch = text.match(/(?:linkedin|linked\.in)\s*:?\s*(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|linkedin\.com\/profile\/)?([\w-]+)/i);
    if (linkedinMatch) {
      const username = linkedinMatch[1];
      socialMedia.linkedin = username.includes('http') ? username : `https://linkedin.com/in/${username}`;
    }

    // Extract Instagram
    const instagramMatch = text.match(/(?:instagram|ig)\s*:?\s*(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)?@?([\w.]+)/i);
    if (instagramMatch) {
      socialMedia.instagram = instagramMatch[1].replace('@', '');
    }

    // Extract Facebook
    const facebookMatch = text.match(/(?:facebook|fb)\s*:?\s*(?:https?:\/\/)?(?:www\.)?(?:facebook\.com\/)?([\w.]+)/i);
    if (facebookMatch) {
      const username = facebookMatch[1];
      socialMedia.facebook = username.includes('http') ? username : `https://facebook.com/${username}`;
    }

    // Extract TikTok
    const tiktokMatch = text.match(/(?:tiktok|tt)\s*:?\s*(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@)?([\w.]+)/i);
    if (tiktokMatch) {
      socialMedia.tiktok = tiktokMatch[1].replace('@', '');
    }

    return socialMedia;
  }

  /**
   * Extract address details from CV text
   */
  extractAddress(text: string): Address {
    const address: Address = {};

    // Extract province
    const provinceMatch = text.match(/(?:province|provinsi)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i);
    if (provinceMatch) {
      address.province = provinceMatch[1].trim();
    }

    // Extract city/district
    const cityMatch = text.match(/(?:city|kota|district|kabupaten)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i);
    if (cityMatch) {
      address.city = cityMatch[1].trim();
    }

    // Extract subdistrict
    const subdistrictMatch = text.match(/(?:subdistrict|kecamatan|sub-district)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|\d)/i);
    if (subdistrictMatch) {
      address.subdistrict = subdistrictMatch[1].trim();
    }

    // Extract postal code
    const postalMatch = text.match(/(?:postal code|kode pos|zip code)\s*:?\s*(\d{5})/i);
    if (postalMatch) {
      address.postalCode = postalMatch[1];
    }

    return address;
  }

  /**
   * Extract education history from CV text
   * Improved patterns for better accuracy
   */
  extractEducation(text: string): Education[] {
    const educations: Education[] = [];
    
    // Find education section - more flexible matching
    const educationSectionMatch = text.match(
      /(?:education|pendidikan|academic|riwayat pendidikan|qualification|qualifications)([\s\S]*?)(?=\n(?:experience|work|professional|skill|organization|certification|project|interest|reference|profile|summary)|$)/i,
    );
    
    if (!educationSectionMatch) {
      return educations;
    }

    const educationText = educationSectionMatch[1];

    // Split by date patterns or institution patterns
    // Look for patterns like: "2019 – 08/2023" or "2016 – 2019" or institution names
    const educationBlocks = educationText.split(/\n(?=\d{4}|(?:university|institut|college|universitas|school|academy|smk|sma|smp))/i);
    
    for (const block of educationBlocks) {
      if (block.trim().length < 30) continue;
      
      const education: Education = {
        institution: '',
        degree: '',
        university: '',
        educationLevel: '',
      };

      // Extract date range (various formats: "2019 – 08/2023", "2016 – 2019", "2019-2023")
      const datePatterns = [
        /(\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|\d{4})/,  // "2019 – 08/2023" or "2019 – 2023"
        /(\d{4})\s*[-–—]\s*(\d{4})/,                  // "2016 – 2019"
        /(\d{4})\s*to\s*(\d{4})/i,                    // "2019 to 2023"
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = block.match(pattern);
        if (dateMatch) {
          education.startYear = dateMatch[1];
          // Handle formats like "08/2023"
          if (dateMatch[2].includes('/')) {
            const parts = dateMatch[2].split('/');
            education.endYear = parts[1] || parts[0];
          } else {
            education.endYear = dateMatch[2];
          }
          break;
        }
      }

      // Extract institution (look for university/college/school names)
      const institutionPatterns = [
        /(?:university|institut|college|universitas|school|academy|akademi|smk|sma|smp)\s+([^\n,]{5,100})/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|Institute|College|School|Academy))/i,
      ];
      
      for (const pattern of institutionPatterns) {
        const instMatch = block.match(pattern);
        if (instMatch) {
          const institution = instMatch[1].trim().split(',')[0].trim();
          education.institution = institution;
          education.university = institution; // Also set university field
          break;
        }
      }

      // Extract degree (Bachelor, Master, PhD, etc.)
      const degreeMatch = block.match(
        /(?:Bachelor|Master|PhD|Doctor|Diploma|S1|S2|S3|D3|D4|Sarjana|Magister|Doktor|BSc|MSc|BA|MA|High School|SMA|SMK|SMP)\s+(?:of|in)?\s*([^\n,]{0,80})/i,
      );
      if (degreeMatch) {
        education.degree = degreeMatch[0].trim();
        // Extract education level from degree
        const degreeText = degreeMatch[0].toLowerCase();
        if (degreeText.includes('phd') || degreeText.includes('doctor') || degreeText.includes('doktor') || degreeText.includes('s3')) {
          education.educationLevel = 'Doctorate';
        } else if (degreeText.includes('master') || degreeText.includes('magister') || degreeText.includes('s2')) {
          education.educationLevel = 'Master';
        } else if (degreeText.includes('bachelor') || degreeText.includes('sarjana') || degreeText.includes('s1')) {
          education.educationLevel = 'Bachelor';
        } else if (degreeText.includes('diploma') || degreeText.includes('d3') || degreeText.includes('d4')) {
          education.educationLevel = 'Diploma';
        } else if (degreeText.includes('high school') || degreeText.includes('sma') || degreeText.includes('smk')) {
          education.educationLevel = 'High School';
        } else if (degreeText.includes('smp')) {
          education.educationLevel = 'Junior High School';
        }
        // Extract major from degree string
        const majorInDegree = degreeMatch[1]?.trim();
        if (majorInDegree && majorInDegree.length > 3) {
          education.major = majorInDegree;
        }
      }

      // Extract major separately if not found in degree
      if (!education.major) {
        const majorMatch = block.match(
          /(?:major|jurusan|program studi|field of study|in)\s*:?\s*([^\n,]{5,80})/i,
        );
        if (majorMatch) {
          education.major = majorMatch[1].trim();
        }
      }

      // Extract GPA (various formats)
      const gpaPatterns = [
        /(?:gpa|ipk|grade)\s*:?\s*(\d+\.?\d*)\s*(?:\/|of|out of|dari)?\s*(\d+\.?\d*)/i,
        /(?:gpa|ipk)\s*:?\s*(\d+\.?\d*)/i,
        /(\d+\.?\d*)\s*(?:\/|of|out of|dari)\s*(\d+\.?\d*)\s*(?:gpa|ipk)/i,
      ];
      
      for (const pattern of gpaPatterns) {
        const gpaMatch = block.match(pattern);
        if (gpaMatch) {
          education.gpa = gpaMatch[1];
          if (gpaMatch[2]) {
            education.gpaMax = gpaMatch[2]; // Set gpaMax field
          } else {
            education.gpaMax = '4.00'; // Default
          }
          break;
        }
      }

      // Extract country/location
      const countryMatch = block.match(/(?:in|at|location)\s+([A-Z][a-zA-Z\s]+?)(?:\n|,|$)/i);
      if (countryMatch) {
        education.country = countryMatch[1].trim();
      }

      // Extract city
      const cityMatch = block.match(/(?:city|kota)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\n|,|$)/i);
      if (cityMatch) {
        education.city = cityMatch[1].trim();
      }

      // Set yearOfStudy from startYear and endYear
      if (education.startYear && education.endYear) {
        education.yearOfStudy = `${education.startYear}-${education.endYear}`;
      } else if (education.startYear) {
        education.yearOfStudy = education.startYear;
      } else if (education.endYear) {
        education.yearOfStudy = education.endYear;
      }

      // Only add if we have at least institution or degree
      if (education.institution || education.degree) {
        educations.push(education);
      }
    }

    return educations;
  }

  /**
   * Extract work experience from CV text
   * Improved patterns for better accuracy
   */
  extractWorkExperience(text: string): WorkExperience[] {
    const experiences: WorkExperience[] = [];

    // Find work experience section - more flexible
    const experienceSectionMatch = text.match(
      /(?:work experience|professional experience|employment|pengalaman kerja|riwayat pekerjaan|experience|career)([\s\S]*?)(?=\n(?:education|skill|organization|certification|project|interest|reference|profile|summary|language)|$)/i,
    );

    if (!experienceSectionMatch) {
      return experiences;
    }

    const experienceText = experienceSectionMatch[1];

    // Split by date patterns or company/position patterns
    // Look for patterns like: "05/2025 - 08/2025" or "Management Trainee" or company names
    const experienceBlocks = experienceText.split(/\n(?=\d{1,2}\/\d{4}|\d{4}|\w+\s+\d{4}|[A-Z][a-z]+\s+[A-Z][a-z]+)/);

    for (const block of experienceBlocks) {
      if (block.trim().length < 30) continue;

      const experience: WorkExperience = {
        company: '',
        position: '',
      };

      // Extract date range (various formats)
      const datePatterns = [
        /(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|\w+\s+\d{4})/,  // "05/2025 - 08/2025"
        /(\w+\s+\d{4})\s*[-–—,]\s*(\w+\s+\d{4}|present|now)/i,     // "May 2025 - August 2025"
        /(\d{4})\s*[-–—]\s*(\d{4}|present|now)/i,                   // "2020 - 2023"
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = block.match(pattern);
        if (dateMatch) {
          experience.startDate = dateMatch[1].trim();
          experience.endDate = dateMatch[2].trim();
          break;
        }
      }

      // Extract position (usually comes before company or in first lines)
      const positionPatterns = [
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}(?:\s+\d+)?)\s*[-–—,]/m,  // "Management Trainee 2 -"
        /(?:as\s+)?(?:position|role|jabatan|title)\s*:?\s*([^\n,]{5,80})/i,
        /(Management Trainee|Software Engineer|Developer|Data Scientist|AI Developer|Intern|Specialist|Analyst|Manager|Director|Coordinator|Officer|Staff)[^\n,]{0,50}/i,
      ];
      
      for (const pattern of positionPatterns) {
        const posMatch = block.match(pattern);
        if (posMatch) {
          experience.position = posMatch[1]?.trim() || posMatch[0].trim();
          // Clean up position
          experience.position = experience.position.replace(/[-–—,].*$/, '').trim();
          break;
        }
      }

      // Extract company (usually after position or in separate line)
      const companyPatterns = [
        /(?:at|company|perusahaan|pt\.?|cv\.?)\s+([A-Z][^\n,]{5,80})/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[,]?\s*(?:Focusing|Led|Implemented|Developed)/i,  // Company before action verbs
        /^([A-Z][^\n,]{5,80})(?:\s*[-–—]\s*[A-Z])/m,  // Company on its own line
      ];
      
      for (const pattern of companyPatterns) {
        const compMatch = block.match(pattern);
        if (compMatch) {
          const company = compMatch[1].trim();
          // Filter out positions
          if (!/(?:engineer|developer|manager|trainee|intern|specialist|analyst)/i.test(company)) {
            experience.company = company;
            break;
          }
        }
      }

      // If no company found, try to find it from context
      if (!experience.company) {
        const lines = block.split('\n');
        for (const line of lines) {
          const lineTrimmed = line.trim();
          // Look for company-like patterns (capitalized, not a position)
          if (
            /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(lineTrimmed) &&
            lineTrimmed.length > 5 &&
            lineTrimmed.length < 50 &&
            !/(?:engineer|developer|manager|trainee|intern)/i.test(lineTrimmed)
          ) {
            experience.company = lineTrimmed;
            break;
          }
        }
      }

      // Extract description (bullet points or paragraphs)
      const descriptions: string[] = [];
      
      // Pattern 1: Action verbs with descriptions (non-global, use match)
      const actionVerbMatch = block.match(
        /(?:Focusing|Led|Implemented|Developed|Created|Managed|Responsible|Key achievement|Achievement)[^\n]{20,500}/i,
      );
      if (actionVerbMatch) {
        descriptions.push(actionVerbMatch[0].trim());
      }
      
      // Pattern 2: Bullet points (use match with while loop)
      const bulletPattern = /[-•·]\s*([^\n]{20,200})/g;
      let bulletMatch;
      while ((bulletMatch = bulletPattern.exec(block)) !== null) {
        const desc = bulletMatch[1] || bulletMatch[0];
        if (desc && desc.length > 20) {
          descriptions.push(desc.trim());
        }
      }
      bulletPattern.lastIndex = 0; // Reset regex
      
      if (descriptions.length > 0) {
        experience.description = descriptions.join(' ').slice(0, 500);
      }

      // Only add if we have at least position
      if (experience.position || experience.company) {
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
   * Improved patterns for better accuracy
   */
  extractSkills(text: string): string[] {
    const skills: string[] = [];

    // Find skills section - more flexible
    const skillsSectionMatch = text.match(
      /(?:skills?|expertise|competenc|keahlian|kemampuan|technical skills?|programming|technologies?|tools?|languages?)([\s\S]*?)(?=\n(?:education|work|experience|organization|certification|project|interest|reference|profile|summary|language|award)|$)/i,
    );

    if (!skillsSectionMatch) {
      return skills;
    }

    const skillsText = skillsSectionMatch[1];

    // Common technical skills patterns
    const technicalSkills = [
      // Programming languages
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Dart|Scala|R|MATLAB)\b/gi,
      // Frameworks
      /\b(React|Vue|Angular|Node\.js|Express|Django|Flask|Spring|Laravel|ASP\.NET|Next\.js|Nuxt\.js)\b/gi,
      // Databases
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Cassandra|SQLite|Oracle|SQL Server)\b/gi,
      // Cloud & DevOps
      /\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|GitHub|GitLab|CI\/CD|Terraform|Ansible)\b/gi,
      // ML/AI
      /\b(TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy|OpenCV|NLTK|spaCy)\b/gi,
      // Tools
      /\b(Git|Jira|Confluence|Slack|VS Code|IntelliJ|Eclipse|Postman|Swagger)\b/gi,
    ];

    // Extract known technical skills
    for (const pattern of technicalSkills) {
      // Use match instead of matchAll for better compatibility
      let match;
      while ((match = pattern.exec(skillsText)) !== null) {
        const skill = match[0].trim();
        if (skill && !skills.includes(skill)) {
          skills.push(skill);
        }
        // Prevent infinite loop if pattern is not global
        if (!pattern.global) {
          break;
        }
      }
      // Reset regex lastIndex
      pattern.lastIndex = 0;
    }

    // Also extract from comma/separator-separated lists
    const lines = skillsText.split('\n');
    for (const line of lines) {
      // Skip lines that are too long (probably descriptions)
      if (line.length > 100) continue;
      
      // Split by common separators
      const items = line
        .split(/[,;•·\-–\|]/)
        .map(s => s.trim())
        .filter(s => {
          // Filter valid skills
          return (
            s.length >= 2 &&
            s.length <= 50 &&
            !/^(?:skill|expertise|technical|soft|language|tool)/i.test(s) &&
            !/^\d+$/.test(s) && // Not just numbers
            !/^[a-z]$/i.test(s) && // Not single letters
            !/^(?:and|or|the|a|an)$/i.test(s) // Not common words
          );
        });

      for (const item of items) {
        // Check if it looks like a skill (capitalized or common tech term)
        if (
          /^[A-Z]/.test(item) || // Starts with capital
          /^[a-z]+(?:\.js|\.py|\.net|\.io)$/i.test(item) || // Tech terms
          item.length >= 3
        ) {
          if (!skills.includes(item)) {
            skills.push(item);
          }
        }
      }
    }

    // Remove duplicates and limit
    return [...new Set(skills)].slice(0, 50);
  }

  /**
   * Extract certifications from CV text
   * Improved patterns to reduce false positives
   */
  extractCertifications(text: string): Certification[] {
    const certifications: Certification[] = [];

    // Find certification section - more flexible
    const certSectionMatch = text.match(
      /(?:certification|certificate|training|course|sertifikat|pelatihan|award|achievement)([\s\S]*?)(?=\n(?:education|work|experience|organization|skill|project|interest|reference|profile|summary|language)|$)/i,
    );

    if (!certSectionMatch) {
      return certifications;
    }

    const certText = certSectionMatch[1];

    // Split by lines that start with capital letters or numbers (likely cert names)
    const certBlocks = certText.split(/\n(?=[A-Z0-9])/);

    for (const block of certBlocks) {
      if (block.trim().length < 15) continue;

      const cert: Certification = {
        name: '',
      };

      // Extract certification name - look for meaningful text
      // Skip lines that are too short or look like descriptions
      const lines = block.split('\n').filter(line => line.trim().length >= 10);
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip if it looks like a description or action verb
        if (
          /^(?:Focusing|Led|Implemented|Developed|Created|Managed|Responsible|Key|Achievement|Became|A|The|This|That)/i.test(trimmed) ||
          trimmed.length > 200 ||
          /^[-•·]\s/.test(trimmed) // Bullet points are usually descriptions
        ) {
          continue;
        }

        // Look for certification-like patterns
        if (
          /(?:certificate|certification|course|training|diploma|certified|certification of|award)/i.test(trimmed) ||
          /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,}/.test(trimmed) // Multiple capitalized words
        ) {
          cert.name = trimmed.slice(0, 150);
          break;
        }
      }

      // If no name found from patterns, use first meaningful line
      if (!cert.name && lines.length > 0) {
        const firstLine = lines[0].trim();
        if (firstLine.length >= 15 && firstLine.length <= 150) {
          cert.name = firstLine;
        }
      }

      // Extract issuer
      const issuerPatterns = [
        /(?:issued by|from|by|oleh|dari|presented by)\s+([A-Z][^\n,]{5,100})/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:Certificate|Certification|Award)/i,
      ];
      
      for (const pattern of issuerPatterns) {
        const issuerMatch = block.match(pattern);
        if (issuerMatch) {
          cert.issuer = issuerMatch[1].trim();
          break;
        }
      }

      // Extract date (various formats)
      const datePatterns = [
        /(\d{4})/,  // Just year
        /(\w+\s+\d{4})/,  // "June 2020"
        /(\d{1,2}\/\d{4})/,  // "06/2020"
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = block.match(pattern);
        if (dateMatch) {
          cert.startDate = dateMatch[1];
          break;
        }
      }

      // Only add if name is meaningful
      if (cert.name && cert.name.length >= 10) {
        certifications.push(cert);
      }
    }

    return certifications;
  }
}


