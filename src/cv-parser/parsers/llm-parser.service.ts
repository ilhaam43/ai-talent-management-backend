import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import { ParsedCandidateData } from '../dto/parsed-candidate-data.dto';

@Injectable()
export class LLMParserService {
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    // Check if LLM is disabled via environment variable
    const llmEnabled = this.configService.get<string>('LLM_ENABLED') !== 'false';
    
    if (!llmEnabled) {
      console.log('LLM parsing is disabled via LLM_ENABLED=false');
      return;
    }

    // Initialize OpenAI client with custom base URL
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseURL = this.configService.get<string>('LLM_BASE_URL') || 'https://console.labahasa.ai/v1';

    if (!apiKey) {
      console.warn('LLM_API_KEY not set. LLM parsing will be disabled.');
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });
  }

  /**
   * Parse CV text using LLM for better accuracy
   */
  async parseCVWithLLM(extractedText: string): Promise<ParsedCandidateData['parsedData']> {
    if (!this.openai) {
      throw new BadRequestException('LLM API not configured. Please set LLM_API_KEY in environment variables.');
    }

    const openai = this.openai; // TypeScript guard

    const prompt = this.buildParsingPrompt(extractedText);

    try {
      console.log('Sending CV text to LLM for parsing...');
      
      // Optimize for speed: lower temperature, max_tokens limit, timeout
      // Increased timeout to 60s for slower LLM services
      const timeout = this.configService.get<number>('LLM_TIMEOUT') || 60000; // 60 seconds default
      
      const response = await Promise.race([
        openai.chat.completions.create({
          model: this.configService.get<string>('LLM_MODEL') || 'llama-4-maverick',
          messages: [
            {
              role: 'system',
              content: 'You are an expert CV parser. Extract structured information from CV text and return ONLY valid JSON. Do not include any explanations or markdown formatting.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1, // Low temperature for consistent parsing
          max_tokens: 3000, // Reduced for faster processing
          response_format: { type: 'json_object' },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LLM request timeout')), timeout),
        ),
      ]) as any;

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM returned empty response');
      }

      // Parse JSON response
      const parsedData = JSON.parse(content);

      console.log('LLM parsing completed successfully');

      return this.normalizeParsedData(parsedData);
    } catch (error: any) {
      console.error('LLM parsing error:', error.message);
      throw new BadRequestException(`LLM parsing failed: ${error.message}`);
    }
  }

  /**
   * Build prompt for LLM to parse CV
   * Optimized for speed: concise prompt, smart text truncation
   */
  private buildParsingPrompt(cvText: string): string {
    // Reduced text length for faster LLM processing (10000 chars)
    // Most CVs are under 10k chars, so this should work for most cases
    const maxLength = 10000;
    let processedText = cvText;
    
    if (cvText.length > maxLength) {
      // Take first 70% (most important: name, contact, education, experience)
      // and last 30% (skills, certifications)
      const firstPart = cvText.substring(0, Math.floor(maxLength * 0.7));
      const lastPart = cvText.substring(cvText.length - Math.floor(maxLength * 0.3));
      processedText = `${firstPart}\n\n[... middle section truncated for speed ...]\n\n${lastPart}`;
    }

    return `Extract CV data into JSON. Return ONLY valid JSON, no explanations.

{
  "personalInfo": {
    "fullName": "string or null",
    "idCardNumber": "string or null",
    "phone": "string or null",
    "gender": "string or null (Male/Female/Other)",
    "maritalStatus": "string or null (Single/Married/Divorced/Widowed)",
    "placeOfBirth": "string or null",
    "nickname": "string or null",
    "email": "string or null",
    "nationality": "string or null",
    "religion": "string or null",
    "dateOfBirth": "string or null (YYYY-MM-DD or DD/MM/YYYY)"
  },
  "socialMedia": {
    "linkedin": "string or null (full URL or username)",
    "instagram": "string or null (username only)",
    "facebook": "string or null (username or URL)",
    "tiktok": "string or null (username only)"
  },
  "address": {
    "province": "string or null",
    "city": "string or null",
    "subdistrict": "string or null",
    "postalCode": "string or null"
  },
  "education": [
    {
      "educationLevel": "string or null (e.g., Bachelor, Master, High School)",
      "major": "string or null",
      "country": "string or null",
      "city": "string or null",
      "university": "string or null",
      "gpa": "string or null",
      "gpaMax": "string or null",
      "yearOfStudy": "string or null",
      "startYear": "string or null",
      "endYear": "string or null"
    }
  ],
  "workExperience": [
    {
      "company": "string",
      "position": "string",
      "jobType": "string or null",
      "fieldOfWork": "string or null",
      "industry": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null",
      "country": "string or null"
    }
  ],
  "organizationExperience": [
    {
      "organization": "string",
      "role": "string",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null",
      "location": "string or null"
    }
  ],
  "skills": ["string"],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "location": "string or null",
      "startDate": "string or null",
      "endDate": "string or null",
      "description": "string or null"
    }
  ]
}

CV Text:
${processedText}

Return ONLY JSON object.`;
  }

  /**
   * Normalize parsed data from LLM to match expected structure
   * Only include fields that have values (null/undefined fields are omitted for autofill)
   */
  private normalizeParsedData(data: any): ParsedCandidateData['parsedData'] {
    // Helper to return null if empty string
    const cleanValue = (value: any) => (value && value.toString().trim() !== '' ? value : null);

    // Normalize personal info
    const personalInfo: any = {};
    if (data.personalInfo) {
      if (data.personalInfo.fullName) personalInfo.fullName = cleanValue(data.personalInfo.fullName);
      if (data.personalInfo.idCardNumber) personalInfo.idCardNumber = cleanValue(data.personalInfo.idCardNumber);
      if (data.personalInfo.phone) personalInfo.phone = cleanValue(data.personalInfo.phone);
      if (data.personalInfo.gender) personalInfo.gender = cleanValue(data.personalInfo.gender);
      if (data.personalInfo.maritalStatus) personalInfo.maritalStatus = cleanValue(data.personalInfo.maritalStatus);
      if (data.personalInfo.placeOfBirth) personalInfo.placeOfBirth = cleanValue(data.personalInfo.placeOfBirth);
      if (data.personalInfo.nickname) personalInfo.nickname = cleanValue(data.personalInfo.nickname);
      if (data.personalInfo.email) personalInfo.email = cleanValue(data.personalInfo.email);
      if (data.personalInfo.nationality) personalInfo.nationality = cleanValue(data.personalInfo.nationality);
      if (data.personalInfo.religion) personalInfo.religion = cleanValue(data.personalInfo.religion);
      if (data.personalInfo.dateOfBirth) personalInfo.dateOfBirth = cleanValue(data.personalInfo.dateOfBirth);
    }

    // Normalize social media
    const socialMedia: any = {};
    if (data.socialMedia) {
      if (data.socialMedia.linkedin) socialMedia.linkedin = cleanValue(data.socialMedia.linkedin);
      if (data.socialMedia.instagram) socialMedia.instagram = cleanValue(data.socialMedia.instagram);
      if (data.socialMedia.facebook) socialMedia.facebook = cleanValue(data.socialMedia.facebook);
      if (data.socialMedia.tiktok) socialMedia.tiktok = cleanValue(data.socialMedia.tiktok);
    }

    // Normalize address
    const address: any = {};
    if (data.address) {
      if (data.address.province) address.province = cleanValue(data.address.province);
      if (data.address.city) address.city = cleanValue(data.address.city);
      if (data.address.subdistrict) address.subdistrict = cleanValue(data.address.subdistrict);
      if (data.address.postalCode) address.postalCode = cleanValue(data.address.postalCode);
    }

    // Normalize education (map legacy fields)
    const education = Array.isArray(data.education)
      ? data.education.map((edu: any) => ({
          educationLevel: cleanValue(edu.educationLevel || edu.degree),
          major: cleanValue(edu.major),
          country: cleanValue(edu.country),
          city: cleanValue(edu.city),
          university: cleanValue(edu.university || edu.institution),
          gpa: cleanValue(edu.gpa),
          gpaMax: cleanValue(edu.gpaMax || edu.maxGpa),
          yearOfStudy: cleanValue(edu.yearOfStudy),
          startYear: cleanValue(edu.startYear),
          endYear: cleanValue(edu.endYear),
          // Legacy fields for backward compatibility
          institution: cleanValue(edu.university || edu.institution),
          degree: cleanValue(edu.educationLevel || edu.degree),
        }))
      : [];

    // Normalize work experience
    const workExperience = Array.isArray(data.workExperience)
      ? data.workExperience.map((work: any) => ({
          company: work.company || '',
          position: work.position || '',
          jobType: cleanValue(work.jobType),
          fieldOfWork: cleanValue(work.fieldOfWork),
          industry: cleanValue(work.industry),
          startDate: cleanValue(work.startDate),
          endDate: cleanValue(work.endDate),
          description: cleanValue(work.description),
          country: cleanValue(work.country),
        }))
      : [];

    // Normalize organization experience
    const organizationExperience = Array.isArray(data.organizationExperience)
      ? data.organizationExperience.map((org: any) => ({
          organization: org.organization || '',
          role: org.role || '',
          startDate: cleanValue(org.startDate),
          endDate: cleanValue(org.endDate),
          description: cleanValue(org.description),
          location: cleanValue(org.location),
        }))
      : [];

    // Normalize skills
    const skills = Array.isArray(data.skills)
      ? data.skills.filter((skill: any) => skill && skill.toString().trim() !== '').map((s: any) => s.toString().trim())
      : [];

    // Normalize certifications
    const certifications = Array.isArray(data.certifications)
      ? data.certifications.map((cert: any) => ({
          name: cert.name || '',
          issuer: cleanValue(cert.issuer),
          location: cleanValue(cert.location),
          startDate: cleanValue(cert.startDate),
          endDate: cleanValue(cert.endDate),
          description: cleanValue(cert.description),
        }))
      : [];

    return {
      personalInfo: Object.keys(personalInfo).length > 0 ? personalInfo : {},
      socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
      address: Object.keys(address).length > 0 ? address : undefined,
      education,
      workExperience,
      organizationExperience,
      skills,
      certifications,
    };
  }

  /**
   * Check if LLM is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
}

