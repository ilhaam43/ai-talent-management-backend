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
    const baseURL = this.configService.get<string>('LLM_BASE_URL') || 'https://dekawicara.cloudeka.ai/api';

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
    const baseURL = this.configService.get<string>('LLM_BASE_URL') || 'https://dekawicara.cloudeka.ai/api';
    const model = this.configService.get<string>('LLM_MODEL') || 'qwen/qwen3-coder';

    const prompt = this.buildParsingPrompt(extractedText);

    try {
      console.log(`Sending CV text to LLM for parsing...`);
      console.log(`  Base URL: ${baseURL}`);
      console.log(`  Model: ${model}`);
      console.log(`  CV Text length: ${extractedText.length} chars`);
      
      // Track timing
      const startTime = Date.now();
      
      // Optimize for speed: lower temperature, max_tokens limit, timeout
      // Increased timeout to 60s for slower LLM services
      const timeout = this.configService.get<number>('LLM_TIMEOUT') || 60000; // 60 seconds default
      // Increased max_tokens to 3000 for larger open models
      const maxTokens = this.configService.get<number>('LLM_MAX_TOKENS') || 3000;
      
      const response = await Promise.race([
        openai.chat.completions.create({
          model: model,
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
          max_tokens: maxTokens,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LLM request timeout')), timeout),
        ),
      ]) as any;

      const responseTime = Date.now() - startTime;
      console.log(`  LLM response time: ${responseTime}ms`);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM returned empty response');
      }

      // Strip markdown code block markers if present (```json ... ```)
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```')) {
        // Remove opening ```json or ``` and closing ```
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      // Parse JSON response
      const parsedData = JSON.parse(jsonContent);

      console.log('LLM parsing completed successfully');

      return this.normalizeParsedData(parsedData);
    } catch (error: any) {
      console.error('LLM parsing error details:');
      console.error(`  Error type: ${error.constructor.name}`);
      console.error(`  Error message: ${error.message}`);
      if (error.status) console.error(`  HTTP Status: ${error.status}`);
      if (error.code) console.error(`  Error code: ${error.code}`);
      if (error.cause) console.error(`  Cause: ${JSON.stringify(error.cause)}`);
      throw new BadRequestException(`LLM parsing failed: ${error.message}`);
    }
  }

  /**
   * Build prompt for LLM to parse CV
   * OPTIMIZED: Ultra-concise prompt for fastest response
   */
  private buildParsingPrompt(cvText: string): string {
    // Reduced text length for faster LLM processing
    const maxLength = 8000;
    let processedText = cvText;
    
    if (cvText.length > maxLength) {
      // Take first 75% (most important: name, contact, education, experience)
      // and last 25% (skills, certifications)
      const firstPart = cvText.substring(0, Math.floor(maxLength * 0.75));
      const lastPart = cvText.substring(cvText.length - Math.floor(maxLength * 0.25));
      processedText = `${firstPart}\n...\n${lastPart}`;
    }

    // Ultra-concise prompt for speed but clear about array structure
    return `Parse this CV into JSON format. Return ONLY valid JSON.

{
  "personalInfo": {"fullName":"","email":"","phone":"","dateOfBirth":"","placeOfBirth":"","gender":"","maritalStatus":"","nationality":"","religion":""},
  "address": {"city":"","province":"","postalCode":""},
  "socialMedia": {"linkedin":"","instagram":"","github":""},
  "education": [{"university":"","major":"","educationLevel":"","gpa":"","gpaMax":"","startYear":"","endYear":"","city":"","country":""}],
  "workExperience": [{"company":"","position":"","jobType":"","startDate":"","endDate":"","description":""}],
  "organizationExperience": [{"organization":"","role":"","startDate":"","endDate":""}],
  "skills": ["skill1","skill2"],
  "certifications": [{"name":"Certification Title 1","issuer":""},{"name":"Certification Title 2","issuer":""}]
}

CRITICAL RULES:
1. certifications: Create ONE SEPARATE OBJECT for EACH certificate. DO NOT combine multiple certifications into one entry.
2. If CV has 18 certifications, output array must have 18 separate objects.
3. For multi-line certification names in CV, combine into one complete title per object.
4. skills: Extract individual technical skills only as separate strings.
5. Use null for missing fields.

CV:
${processedText}`;
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

