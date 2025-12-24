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
  // Common words to exclude from name detection
  private readonly excludedNameWords = new Set([
    // Common CV section headers
    'microsoft', 'office', 'word', 'excel', 'powerpoint', 'skills', 'skill',
    'education', 'experience', 'work', 'professional', 'summary', 'profile',
    'contact', 'information', 'personal', 'objective', 'career', 'about',
    'certification', 'certificate', 'training', 'course', 'language',
    'reference', 'project', 'achievement', 'award', 'interest', 'hobby',
    'curriculum', 'vitae', 'resume', 'other', 'additional', 'soft',
    'hard', 'technical', 'programming', 'database', 'framework',
    // Months
    'january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december',
    // Location/address words (to avoid address extraction as names)
    'jakarta', 'bandung', 'surabaya', 'medan', 'semarang', 'yogyakarta',
    'malang', 'makassar', 'denpasar', 'palembang', 'tangerang', 'bekasi',
    'bogor', 'depok', 'east', 'west', 'north', 'south', 'central',
    'timur', 'barat', 'utara', 'selatan', 'tengah', 'pusat',
    'street', 'road', 'avenue', 'jalan', 'jl', 'klender', 'kelurahan',
    'kecamatan', 'kabupaten', 'kota', 'provinsi', 'indonesia',
    // Academic/publication words (to avoid publication titles as names)
    'conference', 'journal', 'proceeding', 'paper', 'article', 'research',
    'study', 'analysis', 'system', 'method', 'approach', 'application',
    'development', 'implementation', 'design', 'model', 'based', 'using',
    'ict', 'ieee', 'acm', 'springer', 'elsevier', 'international', 'national',
    // Job titles (to avoid positions as names)
    'manager', 'engineer', 'developer', 'analyst', 'specialist', 'officer',
    'coordinator', 'supervisor', 'director', 'executive', 'staff', 'intern',
    'trainee', 'associate', 'senior', 'junior', 'lead', 'head', 'chief',
    // Common filler words
    'for', 'and', 'the', 'with', 'from', 'pada', 'dari', 'dan', 'yang', 'di',
    // Academic titles/descriptions
    'computer', 'science', 'bachelor', 'student', 'master', 'degree',
    'university', 'college', 'school', 'faculty', 'department', 'graduate',
    'undergraduate', 'program', 'diploma', 'sarjana', 'magister', 'doktor',
    'electrical', 'mechanical', 'civil', 'chemical', 'informatics',
    'mathematics', 'physics', 'biology', 'chemistry', 'engineering',
    // Technology/IT terms
    'software', 'hardware', 'data', 'network', 'web', 'mobile', 'cloud',
    'artificial', 'intelligence', 'machine', 'learning', 'deep',
    'frontend', 'backend', 'fullstack', 'devops', 'security',
  ]);

  /**
   * Check if a string looks like a valid person name
   */
  private isValidName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 60) return false;
    
    const words = name.toLowerCase().split(/\s+/);
    
    // At least 2 words for a full name
    if (words.length < 2) return false;
    
    // Check if any word is in excluded list
    for (const word of words) {
      if (this.excludedNameWords.has(word.toLowerCase())) {
        return false;
      }
    }
    
    // Should not contain numbers or special characters (except apostrophe, hyphen)
    if (/[0-9@#$%^&*()+=\[\]{}|\\:";'<>,.?/~`]/.test(name)) {
      return false;
    }
    
    // Each word should start with capital letter
    const originalWords = name.split(/\s+/);
    for (const word of originalWords) {
      if (!/^[A-Z]/.test(word)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract personal information from CV text
   */
  extractPersonalInfo(text: string): PersonalInfo {
    const personalInfo: PersonalInfo = {};

    // Extract email first (needed for name detection context)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }

    // Extract phone (various formats)
    const phoneMatch = text.match(
      /(?:\+?62|0)[\s-]?(?:\d{2,3})[\s-]?\d{3,4}[\s-]?\d{3,4}|\(\+?\d{1,3}\)\s*\d{4,}[\s-]?\d{3,4}|\+?\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/,
    );
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();
    }

    // IMPROVED: Extract name using multiple strategies
    // PDF text order can be unpredictable, so we search the ENTIRE text
    let foundName: string | null = null;

    // Strategy 1: Look for name after "SKILLS SUMMARY" section (common CV pattern)
    const afterSkillsSummary = text.match(/SKILLS SUMMARY\s*\n\s*([A-Z][A-Z\s]+[A-Z])\s*\n/);
    if (afterSkillsSummary && afterSkillsSummary[1]) {
      const rawName = afterSkillsSummary[1].trim();
      if (rawName.length >= 10 && rawName.length <= 50) {
        const name = rawName
          .toLowerCase()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        if (this.isValidName(name)) {
          foundName = name;
        }
      }
    }
    
    // Strategy 2: Look for name before "Born" pattern
    if (!foundName) {
      const beforeBorn = text.match(/\n\s*([A-Z][A-Z\s]+[A-Z])\s*\n[^\n]*Born/);
      if (beforeBorn && beforeBorn[1]) {
        const rawName = beforeBorn[1].trim();
        if (rawName.length >= 10 && rawName.length <= 50) {
          const name = rawName
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (this.isValidName(name)) {
          foundName = name;
          }
        }
      }
    }

    // Strategy 3: Look for any line that is entirely UPPERCASE and looks like a name
    if (!foundName) {
      const lines = text.split('\n');
      const candidateNames: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Check if line is ALL CAPS, 10-50 chars, and has 2-5 words
        if (
          trimmed.length >= 10 &&
          trimmed.length <= 50 &&
          /^[A-Z][A-Z\s]+[A-Z]$/.test(trimmed) && // All uppercase
          trimmed.split(/\s+/).length >= 2 &&
          trimmed.split(/\s+/).length <= 6
        ) {
          // Skip section headers
          if (!/^(?:OTHER SKILLS|SKILLS SUMMARY|WORK EXPERIENCE|WORK EXPERIENCES|EDUCATIONAL HISTORY|PERSONAL PROFILE|PERSONAL INFO|CONTACT|CERTIFICATE|COMPETITION EXPERIENCES|ORGANIZATIONAL EXPERIENCES)/i.test(trimmed)) {
            const name = trimmed
              .toLowerCase()
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            if (this.isValidName(name)) {
              candidateNames.push(name);
            }
          }
        }
      }
      
      // Pick the longest name
      if (candidateNames.length > 0) {
        foundName = candidateNames.sort((a, b) => b.length - a.length)[0];
      }
    }

    // Strategy 2: Look near email/phone (contact section usually has name)
    if (!foundName && emailMatch) {
      const emailIndex = text.indexOf(emailMatch[0]);
      // Search 500 chars around email
      const contextStart = Math.max(0, emailIndex - 500);
      const contextEnd = Math.min(text.length, emailIndex + 500);
      const context = text.substring(contextStart, contextEnd);
      
      // Look for ALL CAPS name in this context
      const contextCapsMatch = context.match(/\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,4})\b/);
      if (contextCapsMatch) {
        const rawName = contextCapsMatch[1].trim();
        if (rawName.length >= 10 && rawName.length <= 50) {
          const name = rawName
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (this.isValidName(name)) {
            foundName = name;
          }
        }
      }
      
      // Also try Title Case pattern
      if (!foundName) {
        const titleCaseMatch = context.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,4})/);
        if (titleCaseMatch) {
          const name = titleCaseMatch[1].trim();
          if (this.isValidName(name)) {
            foundName = name;
          }
        }
      }
    }

    // Strategy 3: Look for "Born in" or "Lahir di" pattern (name usually before this)
    if (!foundName) {
      const bornMatch = text.match(/([A-Z][A-Za-z\s]{5,50}?)(?:\n|\s{2,})(?:Born|Lahir|born|lahir)/);
      if (bornMatch && bornMatch[1]) {
        // Check if the text before "Born" is a name
        const beforeBorn = bornMatch[1].trim();
        // If ALL CAPS, convert to Title Case
        if (/^[A-Z\s]+$/.test(beforeBorn)) {
          const name = beforeBorn
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (this.isValidName(name)) {
            foundName = name;
          }
        } else if (this.isValidName(beforeBorn)) {
          foundName = beforeBorn;
        }
      }
    }

    // Strategy 4: Look for explicit name label
    if (!foundName) {
      const labeledNamePatterns = [
        /(?:name|nama|full name|nama lengkap)\s*[:=]?\s*([A-Z][a-zA-Z\s]{3,50}?)(?:\n|,|\d)/i,
      ];
      
      for (const pattern of labeledNamePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          if (this.isValidName(name)) {
            foundName = name;
            break;
          }
        }
      }
    }

    // Strategy 5: Search for "PERSONAL PROFILE" section
    if (!foundName) {
      const profileMatch = text.match(/(?:PERSONAL PROFILE|PROFIL|ABOUT ME|BIODATA)[\s\S]{0,200}?([A-Z]{2,}(?:\s+[A-Z]{2,}){1,4})/i);
      if (profileMatch && profileMatch[1]) {
        const rawName = profileMatch[1].trim();
        if (rawName.length >= 10 && rawName.length <= 50) {
          const name = rawName
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (this.isValidName(name)) {
            foundName = name;
          }
        }
      }
    }

    // Strategy 6: Extract name from email prefix
    if (!foundName && personalInfo.email) {
      const emailPrefix = personalInfo.email.split('@')[0];
      // Try to extract name from email like "rezaazhar.p" or "adambagushabibiear"
      let candidateName = emailPrefix
        .replace(/[\d._-]/g, ' ')  // Replace numbers, dots, underscores, hyphens with spaces
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to spaces
        .trim();
      
      // Process each word to try to split concatenated names
      const words = candidateName.split(/\s+/).filter(w => w.length >= 2);
      const processedWords: string[] = [];
      
      for (const word of words) {
        // Skip single letter words like "p" from "rezaazhar.p"
        if (word.length <= 1) continue;
        
        // Try to split concatenated names (e.g., "rezaazhar" -> "reza azhar")
        if (word.length >= 6) {
          const patterns = [
            // Common Indonesian last names
            /^(.{3,})(azhar|rahman|hidayat|pratama|wijaya|kusuma|putra|putri|sari|dewi|lestari|wati|ningsih|rini|yanti|syah|shah|din|wan|man)$/i,
            // Common first names + remainder
            /^(reza|andi|dian|dewi|eko|fajar|galih|hadi|irfan|joko|kiki|lina|maya|nanda|okta|qori|rina|titi|udin|vina|widi|yani|zaki|adam|bagus|adit|muhammad|ahmad|putri|siti|nur|adi|tri|dwi|agus|budi|eko|dedi|hendra|indra|joko|kurnia|lukman|moh|nova|oki|pras|qomar|rudi|sandi|tono|uki|vino|wahyu|xavi|yuda|zul)(.{3,})$/i,
          ];
          
          let split = false;
          for (const pattern of patterns) {
            const match = word.match(pattern);
            if (match && match[1].length >= 3 && match[2].length >= 3) {
              processedWords.push(match[1]);
              processedWords.push(match[2]);
              split = true;
              break;
            }
          }
          
          if (!split) {
            processedWords.push(word);
          }
        } else {
          processedWords.push(word);
        }
      }
      
      if (processedWords.length >= 1) {
        // Title case it
        candidateName = processedWords
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        if (!foundName) {
          foundName = candidateName;
        }
      }
    }

    // Strategy 7: Look in the first 500 characters for Title Case names
    if (!foundName) {
      const firstPart = text.substring(0, 500);
      // Match sequences of Title Case words (3-6 words)
      const titleCaseMatches = firstPart.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})/g);
      if (titleCaseMatches) {
        for (const match of titleCaseMatches) {
          if (this.isValidName(match)) {
            foundName = match;
            break;
          }
        }
      }
    }

    // Strategy 8: Look for name followed by specific patterns
    if (!foundName) {
      const namePatterns = [
        // "Muhammad Reza Azhar Priyadi\n" at line start
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\s*$/m,
        // After "Curriculum Vitae" or "Resume"
        /(?:curriculum vitae|resume|cv)\s*[-–]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})/i,
        // Near phone/email section
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\s*(?:\n|,)\s*(?:\+?\d|[\w.]+@)/,
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1] && this.isValidName(match[1].trim())) {
          foundName = match[1].trim();
          break;
        }
      }
    }

    // Strategy 9: Look for ALL CAPS single line that could be a name (more relaxed)
    if (!foundName) {
      const capsLines = text.match(/^([A-Z][A-Z\s]{5,40}[A-Z])$/gm);
      if (capsLines) {
        for (const line of capsLines) {
          const trimmed = line.trim();
          const wordCount = trimmed.split(/\s+/).length;
          if (wordCount >= 2 && wordCount <= 5) {
            const name = trimmed
              .toLowerCase()
              .split(/\s+/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            if (this.isValidName(name)) {
              foundName = name;
              break;
            }
          }
        }
      }
    }

    if (foundName) {
      personalInfo.fullName = foundName;
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

    // Extract LinkedIn - require proper URL format or explicit label
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\s*:?\s*(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/)([a-zA-Z0-9_-]{3,})/i);
    if (linkedinMatch && linkedinMatch[1].length >= 3) {
      const username = linkedinMatch[1];
      socialMedia.linkedin = `https://linkedin.com/in/${username}`;
    }

    // Extract Instagram - require URL format or @ symbol, min 3 chars
    const instagramMatch = text.match(/(?:instagram\.com\/|instagram\s*:?\s*@?)([a-zA-Z0-9_.]{3,30})(?:\s|$|,)/i);
    if (instagramMatch && instagramMatch[1].length >= 3 && !/^(?:com|org|net|edu)$/i.test(instagramMatch[1])) {
      socialMedia.instagram = instagramMatch[1].replace('@', '');
    }

    // Extract Facebook - require URL format, min 3 chars
    const facebookMatch = text.match(/facebook\.com\/([a-zA-Z0-9_.]{3,50})/i);
    if (facebookMatch && facebookMatch[1].length >= 3) {
      socialMedia.facebook = `https://facebook.com/${facebookMatch[1]}`;
    }

    // Extract TikTok - require URL format or @ symbol, min 3 chars
    const tiktokMatch = text.match(/(?:tiktok\.com\/@|tiktok\s*:?\s*@)([a-zA-Z0-9_.]{3,30})/i);
    if (tiktokMatch && tiktokMatch[1].length >= 3) {
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
      /(?:education|educational|pendidikan|academic|riwayat pendidikan|qualification|qualifications|educational history|educational background)([\s\S]*?)(?=\n(?:experience|work|professional|skill|organization|certification|project|interest|reference|other|competition|award|certificate)|$)/i,
    );
    
    // Also try to find education without section header (common in CVs)
    let educationText = educationSectionMatch ? educationSectionMatch[1] : '';
    
    // If no education section found, scan entire text for university patterns
    if (!educationText) {
      educationText = text;
    }

    // IMPROVED: Better pattern to find education entries
    // Look for specific university names first (more accurate)
    const knownUniversities = [
      'Bina Nusantara University',
      'Universitas Bina Nusantara',
      'BINUS University',
      'Telkom University',
      'Universitas Telkom',
      'Institut Teknologi Bandung',
      'Universitas Indonesia',
      'Universitas Gadjah Mada',
      'Institut Teknologi Sepuluh Nopember',
      'Universitas Airlangga',
      'Universitas Padjadjaran',
      'Universitas Diponegoro',
      'Universitas Brawijaya',
      'Universitas Hasanuddin',
    ];

    const foundInstitutions: string[] = [];
    
    // First, try to find known universities
    for (const uni of knownUniversities) {
      if (educationText.toLowerCase().includes(uni.toLowerCase())) {
        foundInstitutions.push(uni);
      }
    }

    // If no known universities found, use pattern matching
    if (foundInstitutions.length === 0) {
      const universityPatterns = [
        // Indonesian universities - more restrictive pattern
        /(?:Universitas|University|Institut|Institute|Politeknik)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/g,
        // Schools - more restrictive
        /(?:SMAN?|SMKN?)\s*\d+\s*[A-Z][a-z]+/g,
      ];

      for (const pattern of universityPatterns) {
        let match;
        while ((match = pattern.exec(educationText)) !== null) {
          // Clean the match - remove newlines and limit length
          let institution = match[0].trim()
            .replace(/\n.*/g, '')  // Remove everything after newline
            .replace(/\s+/g, ' ')  // Normalize whitespace
            .trim();
          
          // Limit to reasonable length (max 50 chars)
          if (institution.length > 50) {
            institution = institution.substring(0, 50).trim();
          }
          
          if (institution.length >= 10 && !foundInstitutions.includes(institution)) {
            foundInstitutions.push(institution);
          }
        }
        pattern.lastIndex = 0;
      }
    }

    // Process each found institution
    for (const institution of foundInstitutions) {
      const education: Education = {
        institution: institution,
        degree: '',
        university: institution,
        educationLevel: '',
      };

      // Find the context around this institution (200 chars before and after)
      const instIndex = educationText.indexOf(institution);
      const contextStart = Math.max(0, instIndex - 200);
      const contextEnd = Math.min(educationText.length, instIndex + institution.length + 300);
      const context = educationText.substring(contextStart, contextEnd);

      // Extract date range from context
      const datePatterns = [
        /\((\d{4})\s*[-–—]\s*(\d{4})\)/,           // "(2017 – 2021)"
        /(\d{4})\s*[-–—]\s*(\d{4})/,               // "2017 – 2021"
        /(\d{4})\s*[-–]\s*(\d{1,2}\/\d{4})/,       // "2019 – 08/2023"
        /(\d{4})\s*to\s*(\d{4})/i,                  // "2019 to 2023"
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = context.match(pattern);
        if (dateMatch) {
          education.startYear = dateMatch[1];
          if (dateMatch[2].includes('/')) {
            const parts = dateMatch[2].split('/');
            education.endYear = parts[1] || parts[0];
          } else {
            education.endYear = dateMatch[2];
          }
          break;
        }
      }

      // Extract major/degree from context
      const majorPatterns = [
        /(?:Electrical Engineering|Computer Science|Information Technology|Teknik Informatika|Teknik Elektro|Sistem Informasi|Manajemen|Akuntansi|Hukum|Kedokteran|Farmasi|Psikologi|Ekonomi)[^\n,]*/i,
        /(?:jurusan|major|program studi|faculty of)\s*:?\s*([A-Za-z\s]+?)(?:\n|,|\(|\d)/i,
        /(?:Bachelor|Sarjana|S1|S\.?Kom|S\.?T|S\.?E|S\.?H)\s+(?:of|in)?\s*([A-Za-z\s]+?)(?:\n|,|\(|\d)/i,
      ];

      for (const pattern of majorPatterns) {
        const majorMatch = context.match(pattern);
        if (majorMatch) {
          education.major = (majorMatch[1] || majorMatch[0]).trim();
          education.degree = majorMatch[0].trim();
          break;
        }
      }

      // Determine education level
      const instLower = institution.toLowerCase();
      const contextLower = context.toLowerCase();
      
      if (instLower.includes('universitas') || instLower.includes('university') || instLower.includes('institut')) {
        if (contextLower.includes('s2') || contextLower.includes('magister') || contextLower.includes('master')) {
          education.educationLevel = 'Master';
        } else if (contextLower.includes('s3') || contextLower.includes('doktor') || contextLower.includes('phd')) {
          education.educationLevel = 'Doctorate';
        } else {
          education.educationLevel = 'Bachelor';
        }
      } else if (instLower.includes('politeknik') || instLower.includes('akademi') || instLower.includes('d3') || instLower.includes('d4')) {
        education.educationLevel = 'Diploma';
      } else if (instLower.includes('sma') || instLower.includes('smk') || instLower.includes('high school')) {
        education.educationLevel = 'High School';
      } else if (instLower.includes('smp')) {
        education.educationLevel = 'Junior High School';
      }

      // Extract GPA from context
      const gpaPatterns = [
        /(?:gpa|ipk)\s*(?:of|:)?\s*(\d+[.,]\d+)\s*(?:\/|of|out of|dari)?\s*(\d+[.,]\d+)?/i,
        /(\d+[.,]\d+)\s*(?:\/|of)\s*(\d+[.,]\d+)/,
      ];
      
      for (const pattern of gpaPatterns) {
        const gpaMatch = context.match(pattern);
        if (gpaMatch) {
          education.gpa = gpaMatch[1].replace(',', '.');
          education.gpaMax = gpaMatch[2]?.replace(',', '.') || '4.00';
          break;
        }
      }

      // Extract city from context (for Indonesian CVs)
      const cityPatterns = [
        /(?:Bandung|Jakarta|Surabaya|Yogyakarta|Semarang|Malang|Medan|Makassar|Denpasar|Bengkulu|Palembang|Lampung)/i,
      ];
      
      for (const pattern of cityPatterns) {
        const cityMatch = context.match(pattern);
        if (cityMatch) {
          education.city = cityMatch[0];
          education.country = 'Indonesia';
          break;
        }
      }

      // Set yearOfStudy
      if (education.startYear && education.endYear) {
        education.yearOfStudy = `${education.startYear}-${education.endYear}`;
      }

      // Avoid duplicates
      const isDuplicate = educations.some(e => 
        e.institution?.toLowerCase() === education.institution?.toLowerCase()
      );
      
      if (!isDuplicate && education.institution) {
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
      /(?:work experience|professional experience|employment|pengalaman kerja|riwayat pekerjaan|work experiences|career|work history)([\s\S]*?)(?=\n(?:education|skill|organization|certification|project|interest|reference|profile|summary|language|competition|award|other|personal interest|personal profile)|$)/i,
    );

    let experienceText = experienceSectionMatch ? experienceSectionMatch[1] : text;

    // STRATEGY 1: Parse lines starting with "-" (common Indonesian CV format)
    // Pattern: "-PT Company Name (date range)"
    const dashLinePattern = /^-\s*(.+?)\s*\(([^)]+)\)\s*$/gm;
    let dashMatch;
    
    while ((dashMatch = dashLinePattern.exec(experienceText)) !== null) {
      const lineContent = dashMatch[1].trim();
      const dateRange = dashMatch[2].trim();
      
      const experience: WorkExperience = {
        company: '',
        position: '',
      };
      
      // Parse date range
      const dateMatch = dateRange.match(/(\d{1,2}\s*\w+\s*\d{4}|\d{1,2}\s+\w+|\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\s*\w+\s*\d{4}|Now|Present|Sekarang|\d{4})/i);
      if (dateMatch) {
        experience.startDate = dateMatch[1].trim();
        experience.endDate = dateMatch[2].trim();
      }
      
      // Check if it's an internship
      if (/^internship/i.test(lineContent)) {
        experience.jobType = 'Internship';
        // Extract company from "Internship Direktorat... Telkom Indonesia"
        const internCompany = lineContent.replace(/^internship\s*/i, '').trim();
        experience.company = internCompany;
        experience.position = 'Intern';
      } else if (/^PT\.?\s+/i.test(lineContent)) {
        // It's a company name like "PT PLN (Persero) UP3 Bengkulu"
        experience.company = lineContent;
      } else {
        // Could be company name without PT prefix
        experience.company = lineContent;
      }
      
      if (experience.company) {
        experiences.push(experience);
      }
    }
    dashLinePattern.lastIndex = 0;

    // STRATEGY 2: Look for PT/CV company patterns with date in parentheses
    const ptPattern = /(?:PT\.?|CV\.?)\s+[A-Za-z\s\(\)]+(?:\s+\([^)]*\d{4}[^)]*\))?/gi;
    let ptMatch;
    
    while ((ptMatch = ptPattern.exec(experienceText)) !== null) {
      const fullMatch = ptMatch[0].trim();
      
      // Skip if already found
      const alreadyExists = experiences.some(e => 
        e.company?.toLowerCase().includes(fullMatch.toLowerCase().substring(0, 15)) ||
        fullMatch.toLowerCase().includes(e.company?.toLowerCase().substring(0, 15) || '')
      );
      
      if (!alreadyExists) {
        const experience: WorkExperience = {
          company: fullMatch.replace(/\s*\([^)]*\d{4}[^)]*\)\s*$/, '').trim(),
          position: '',
        };
        
        // Try to extract date from the full match
        const dateMatch = fullMatch.match(/\(([^)]*\d{4}[^)]*)\)/);
        if (dateMatch) {
          const dates = dateMatch[1].match(/(\d{1,2}\s*\w+\s*\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\s*\w+\s*\d{4}|\d{4}|Now|Present)/i);
          if (dates) {
            experience.startDate = dates[1];
            experience.endDate = dates[2];
          }
        }
        
        if (experience.company.length >= 5) {
          experiences.push(experience);
        }
      }
    }
    ptPattern.lastIndex = 0;

    // STRATEGY 3: Look for well-known company names
    const knownCompanies = [
      'Telkom', 'Telkomsel', 'PLN', 'Pertamina', 'BCA', 'BRI', 'Mandiri', 'BNI',
      'Tokopedia', 'Gojek', 'Shopee', 'Bukalapak', 'Traveloka', 'Grab', 'OVO',
      'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'IBM', 'Oracle', 'Cisco',
      'Accenture', 'Deloitte', 'McKinsey', 'Dimension Data', 'Lintasarta',
    ];
    
    for (const company of knownCompanies) {
      const companyPattern = new RegExp(`${company}[A-Za-z\\s]*(?:\\([^)]*\\))?`, 'gi');
      let match;
      
      while ((match = companyPattern.exec(experienceText)) !== null) {
        const foundCompany = match[0].trim();
        
        // Check for duplicates
        const alreadyExists = experiences.some(e => 
          e.company?.toLowerCase().includes(company.toLowerCase())
        );
        
        if (!alreadyExists && foundCompany.length >= 5) {
          // Get context around the match
          const contextStart = Math.max(0, match.index - 200);
          const contextEnd = Math.min(experienceText.length, match.index + foundCompany.length + 300);
          const context = experienceText.substring(contextStart, contextEnd);
          
          const experience: WorkExperience = {
            company: foundCompany,
            position: '',
          };
          
          // Try to extract date
          const dateMatch = context.match(/\((\d{1,2}\s*\w+\s*\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\s*\w+\s*\d{4}|\d{4}|Now|Present)\)/i);
          if (dateMatch) {
            experience.startDate = dateMatch[1];
            experience.endDate = dateMatch[2];
          }
          
          // Try to extract position
          const positionMatch = context.match(/(?:as|position|role)\s*:?\s*([A-Za-z\s]+?)(?:\n|,|at)/i);
          if (positionMatch) {
            experience.position = positionMatch[1].trim();
          }
          
          experiences.push(experience);
        }
      }
      companyPattern.lastIndex = 0;
    }

    // Post-process: Try to find positions for experiences without one
    for (const exp of experiences) {
      if (!exp.position) {
        // Look for position patterns near the company in the text
        const companyIndex = experienceText.toLowerCase().indexOf(exp.company?.toLowerCase().substring(0, 10) || '');
        if (companyIndex >= 0) {
          const context = experienceText.substring(Math.max(0, companyIndex - 200), companyIndex + 200);
          
          const positionPatterns = [
            /(?:Management Trainee|Software Engineer|System Engineer|Network Engineer|Data Engineer|Data Scientist|Backend Developer|Frontend Developer|Full Stack|DevOps|QA Engineer|Product Manager|Project Manager|Business Analyst|IT Support|Technical Support|Staff|Specialist|Coordinator|Supervisor|Lead|Senior|Junior|Intern|Trainee|Engineer|Developer|Analyst|Manager|Officer)(?:\s+\d+)?/i,
          ];
          
          for (const pattern of positionPatterns) {
            const posMatch = context.match(pattern);
            if (posMatch) {
              exp.position = posMatch[0].trim();
              break;
            }
          }
        }
      }
      
      // Set job type if not set
      if (!exp.jobType) {
        if (/internship|magang|intern\b/i.test(exp.company || '') || /intern/i.test(exp.position || '')) {
          exp.jobType = 'Internship';
        } else {
          exp.jobType = 'Full-time';
        }
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
   * IMPROVED: Uses whitelist approach to only extract recognized tech skills
   */
  extractSkills(text: string): string[] {
    const skills: string[] = [];

    // Define a comprehensive whitelist of known tech skills
    const knownSkills = [
      // Programming languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 
      'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB', 'C', 'Perl',
      'Haskell', 'Elixir', 'Clojure', 'F#', 'Lua', 'Julia', 'Assembly', 'COBOL',
      // Web technologies
      'HTML', 'HTML5', 'CSS', 'CSS3', 'SASS', 'SCSS', 'Less', 'Bootstrap', 'Tailwind',
      'jQuery', 'Ajax', 'REST', 'RESTful', 'GraphQL', 'WebSocket', 'JSON', 'XML',
      // Frameworks & Libraries
      'React', 'React.js', 'ReactJS', 'Vue', 'Vue.js', 'VueJS', 'Angular', 'AngularJS',
      'Node.js', 'NodeJS', 'Express', 'Express.js', 'Django', 'Flask', 'FastAPI',
      'Spring', 'Spring Boot', 'Laravel', 'Symfony', 'CodeIgniter', 'ASP.NET', '.NET',
      'Next.js', 'NextJS', 'Nuxt.js', 'NuxtJS', 'Gatsby', 'Svelte', 'Ember',
      'NestJS', 'Nest.js', 'Ruby on Rails', 'Rails', 'Gin', 'Echo', 'Fiber',
      // Mobile
      'React Native', 'Flutter', 'Xamarin', 'Ionic', 'SwiftUI', 'Jetpack Compose',
      'Android', 'iOS', 'Mobile Development',
      // Databases
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
      'SQLite', 'Oracle', 'SQL Server', 'MariaDB', 'DynamoDB', 'CouchDB', 'Neo4j',
      'Firebase', 'Firestore', 'Supabase', 'Prisma', 'Sequelize', 'TypeORM',
      // Cloud & DevOps
      'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Cloud Computing',
      'Docker', 'Kubernetes', 'K8s', 'Jenkins', 'CI/CD', 'GitLab CI', 'GitHub Actions',
      'Terraform', 'Ansible', 'Puppet', 'Chef', 'Vagrant', 'Nginx', 'Apache',
      'Linux', 'Unix', 'Bash', 'Shell', 'PowerShell', 'DevOps', 'SRE',
      // Version Control
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',
      // AI/ML
      'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'sklearn', 'Pandas', 'NumPy',
      'OpenCV', 'NLTK', 'spaCy', 'Hugging Face', 'Machine Learning', 'Deep Learning',
      'Natural Language Processing', 'NLP', 'Computer Vision', 'Neural Networks',
      'Data Science', 'Data Analysis', 'Data Mining', 'Big Data', 'Hadoop', 'Spark',
      'AI', 'Artificial Intelligence', 'Chatbot', 'LLM',
      // Testing
      'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Puppeteer', 'Playwright',
      'JUnit', 'PyTest', 'PHPUnit', 'RSpec', 'Testing', 'Unit Testing', 'TDD', 'BDD',
      // Tools
      'VS Code', 'Visual Studio', 'IntelliJ', 'Eclipse', 'PyCharm', 'WebStorm',
      'Postman', 'Swagger', 'Insomnia', 'Jira', 'Confluence', 'Trello', 'Asana',
      'Slack', 'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
      // Architecture & Patterns
      'Microservices', 'Monolith', 'MVC', 'MVVM', 'REST API', 'API', 'OOP',
      'Design Patterns', 'SOLID', 'DDD', 'Event Driven', 'Serverless', 'Lambda',
      // Security
      'OAuth', 'JWT', 'SSL/TLS', 'Encryption', 'Cybersecurity', 'Penetration Testing',
      // Other
      'Agile', 'Scrum', 'Kanban', 'Project Management', 'Leadership', 'Communication',
      'Problem Solving', 'Teamwork', 'Critical Thinking',
    ];

    // Create a case-insensitive lookup
    const skillsLower = new Map(knownSkills.map(s => [s.toLowerCase(), s]));
    
    // Search the entire text for known skills
    for (const [skillLower, skillOriginal] of skillsLower) {
      // Use word boundary matching
      const pattern = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(text) && !skills.includes(skillOriginal)) {
        skills.push(skillOriginal);
      }
    }

    // Remove duplicates (case-insensitive) and limit
    const seen = new Set<string>();
    const uniqueSkills = skills.filter(skill => {
      const lower = skill.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    return uniqueSkills.slice(0, 50);
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



