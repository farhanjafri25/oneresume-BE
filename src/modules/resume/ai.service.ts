import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }

  async reviewResumeAgainstJd(pdfUrl: string, jd: string) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured on the server. Please add it to your .env file.');
    }
    
    // 1. Fetch PDF file as a buffer from S3/UploadThing
    let pdfBuffer: Buffer;
    try {
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      pdfBuffer = Buffer.from(response.data);
    } catch (error) {
      throw new BadRequestException(`Failed to download resume PDF from: ${pdfUrl}. Please verify the PDF link is accessible.`);
    }

    // 2. Prepare the prompt
    const prompt = `
      You are an expert technical recruiter and ATS scanner.
      Analyze the attached candidate resume PDF against the provided Job Description (JD).
      
      Job Description:
      ${jd}
      
      Evaluate:
      1. Overall match score (0-100). Be extremely critical, strict, and objective (like a professional ATS scanner):
         - Start at 100 and deduct 10-15 points for every critical required skill or core technology missing.
         - Deduct 10-15 points if years of experience or seniority level doesn't align with the JD requirements.
         - Deduct 5-10 points if key certifications or education requirements are missing.
         - A score above 80 should represent a near-perfect candidate. An average candidate with some missing skills should score 50-65. A weak match should score below 40.
      2. Matching skills found in both the resume and the JD.
      3. Missing skills or keywords mentioned in the JD but not found in the resume.
      4. A brief, encouraging executive summary of the alignment, highlighting both key strengths and main gaps.
      5. Practical, actionable bullet-point recommendations to improve the resume for this specific role.
    `;

    // 3. Call Gemini 1.5 Flash with structured JSON schema
    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: pdfBuffer.toString('base64'),
                  mimeType: 'application/pdf',
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: 'ATS match score from 0 to 100' },
              summary: { type: Type.STRING, description: '2-3 sentence executive alignment summary' },
              matchingSkills: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: 'Key matching skills found' 
              },
              missingSkills: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: 'Important skills/keywords mentioned in JD but missing in CV' 
              },
              recommendations: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: 'Step-by-step actionable recommendations to optimize the CV' 
              },
            },
            required: ['score', 'summary', 'matchingSkills', 'missingSkills', 'recommendations'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      return JSON.parse(result.text);
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
      if (mistralApiKey) {
        try {
          return await this.callMistral(pdfUrl, prompt, {
            score: 'integer (ATS match score from 0 to 100)',
            summary: 'string (2-3 sentence executive alignment summary)',
            matchingSkills: 'array of strings (key matching skills found)',
            missingSkills: 'array of strings (important skills/keywords mentioned in JD but missing in CV)',
            recommendations: 'array of strings (step-by-step actionable recommendations to optimize the CV)'
          });
        } catch (mistralError: any) {
          throw new BadRequestException(`Both Gemini and Mistral fallback failed. Gemini Error: ${errorMessage}. Mistral Error: ${mistralError?.message}`);
        }
      }
      if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
        throw new BadRequestException('Our AI servers are experiencing a high demand. Please try again later.');
      }
      throw new BadRequestException('AI CV Analysis failed. Please try again.');
    }
  }

  async generalResumeScan(pdfUrl: string) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured on the server. Please add it to your .env file.');
    }
    
    // 1. Fetch PDF file as a buffer
    let pdfBuffer: Buffer;
    try {
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      pdfBuffer = Buffer.from(response.data);
    } catch (error) {
      throw new BadRequestException(`Failed to download resume PDF from: ${pdfUrl}. Please verify the PDF link is accessible.`);
    }

    // 2. Prepare the prompt
    const prompt = `
      You are an expert technical recruiter and ATS scanner.
      Analyze the attached candidate resume PDF for general ATS compatibility and structural quality.
      
      Evaluate:
      1. Overall ATS parsability score (0-100). Be extremely critical and rigorous. Start at 100 and apply strict deductions:
         - Deduct 15 points if the format uses non-standard headings, complex tables, graphics/images, or multi-column layouts (which disrupt standard ATS parsers).
         - Deduct 15 points if work experience bullet points do not show quantitative, metrics-driven achievements (e.g. lack of percentages, user growth numbers, tool names, or performance stats).
         - Deduct 10 points if there is a low usage or absence of active action verbs.
         - Deduct 10 points if vital contact info (Email, Phone, or LinkedIn URL) is missing.
         - An excellent resume with standard format and metrics should score 80-90. Reserve scores above 90 only for absolute best-practice, perfect templates. A generic or poorly structured resume should score 40-60.
      2. A brief executive summary of the resume's structural strengths and weaknesses.
      3. Parsability status (e.g., "Excellent", "Good", "Needs Work") and a short explanation.
      4. Section Formatting status (e.g., "Good - 91%") and explanation (are headers standard? bullet points used correctly?).
      5. Action verbs usage (count or impact analysis, e.g. "High Impact - 24 verbs").
      6. Missing contact info (check for Email, Phone, LinkedIn). Mention what is complete or missing.
    `;

    // 3. Call Gemini 1.5 Flash with structured JSON schema
    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: pdfBuffer.toString('base64'),
                  mimeType: 'application/pdf',
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: 'ATS parsability score from 0 to 100' },
              summary: { type: Type.STRING, description: '2-3 sentence executive summary of strengths and weaknesses' },
              parsability: { type: Type.STRING, description: 'Parsability status and explanation' },
              formatting: { type: Type.STRING, description: 'Section formatting status and explanation' },
              actionVerbs: { type: Type.STRING, description: 'Analysis of action verbs used' },
              missingContactInfo: { type: Type.STRING, description: 'Contact information completeness' },
            },
            required: ['score', 'summary', 'parsability', 'formatting', 'actionVerbs', 'missingContactInfo'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      return JSON.parse(result.text);
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
      if (mistralApiKey) {
        try {
          return await this.callMistral(pdfUrl, prompt, {
            score: 'integer (ATS parsability score from 0 to 100)',
            summary: 'string (2-3 sentence executive summary of strengths and weaknesses)',
            parsability: 'string (parsability status and explanation)',
            formatting: 'string (section formatting status and explanation)',
            actionVerbs: 'string (analysis of action verbs used)',
            missingContactInfo: 'string (contact info completeness)'
          });
        } catch (mistralError: any) {
          throw new BadRequestException(`Both Gemini and Mistral fallback failed. Gemini Error: ${errorMessage}. Mistral Error: ${mistralError?.message}`);
        }
      }
      if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
        throw new BadRequestException('Our AI servers are experiencing a high demand. Please try again later.');
      }
      throw new BadRequestException('AI General CV Scan failed. Please try again.');
    }
  }

  async tailorResumeAgainstJd(pdfUrl: string, jd: string) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured on the server. Please add it to your .env file.');
    }

    // 1. Fetch PDF file as a buffer
    let pdfBuffer: Buffer;
    try {
      const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
      pdfBuffer = Buffer.from(response.data);
    } catch (error) {
      throw new BadRequestException(`Failed to download resume PDF from: ${pdfUrl}. Please verify the PDF link is accessible.`);
    }

    // 2. Prepare prompt
    const prompt = `
      You are an expert technical resume writer.
      Review the attached candidate resume PDF and the provided Job Description (JD).
      
      Job Description:
      ${jd}
      
      Your goal is to extract the resume sections and rewrite/tailor the professional summary and work experiences to align directly with the Job Description.
      
      Rules:
      1. Extract name, email, phone, location, and LinkedIn (or other links) exactly as they are. If not found, use empty strings.
      2. Professional Summary: Re-write into an engaging, high-impact 2-3 sentence paragraph tailored to the JD's core requirements.
      3. Work Experience: Rewrite the roles, companies, dates, and locations. For each experience, generate 3 high-impact bullet points highlighting accomplishments, matching skills, and tools mentioned in the JD. Maintain honest chronology and claims, but rephrase them to emphasize alignment.
      4. Skills: Extract and list matching skills (technologies, frameworks, methodologies) mentioned in both the resume and the JD. Output them as a single comma-separated string (e.g. "TypeScript, React, Next.js, Node.js").
      5. Education: Extract the degrees, dates, institutions, and locations.
    `;

    // 3. Call Gemini 2.5 Flash with structured JSON schema
    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: pdfBuffer.toString('base64'),
                  mimeType: 'application/pdf',
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Candidates full name' },
              title: { type: Type.STRING, description: 'Professional title aligned with the JD' },
              email: { type: Type.STRING, description: 'Contact email' },
              phone: { type: Type.STRING, description: 'Contact phone' },
              location: { type: Type.STRING, description: 'Candidate location (City, State/Country)' },
              linkedin: { type: Type.STRING, description: 'LinkedIn URL or other link' },
              summary: { type: Type.STRING, description: 'Tailored 2-3 sentence professional summary' },
              skills: { type: Type.STRING, description: 'Comma-separated list of technologies and skills' },
              experiences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    job_title: { type: Type.STRING, description: 'Job title / role' },
                    company: { type: Type.STRING, description: 'Company name' },
                    job_dates: { type: Type.STRING, description: 'Dates worked (e.g., June 2022 - Present)' },
                    job_location: { type: Type.STRING, description: 'Job location (City, State)' },
                    job_bullet_1: { type: Type.STRING, description: 'First optimized bullet point' },
                    job_bullet_2: { type: Type.STRING, description: 'Second optimized bullet point' },
                    job_bullet_3: { type: Type.STRING, description: 'Third optimized bullet point' },
                  },
                  required: ['job_title', 'company', 'job_dates', 'job_bullet_1', 'job_bullet_2', 'job_bullet_3'],
                },
                description: 'List of past work experience entries'
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    degree: { type: Type.STRING, description: 'Degree received (e.g. BS Computer Science)' },
                    institution: { type: Type.STRING, description: 'University/College name' },
                    edu_date: { type: Type.STRING, description: 'Graduation date or range (e.g. 2018 - 2022)' },
                    edu_location: { type: Type.STRING, description: 'School location' },
                  },
                  required: ['degree', 'institution', 'edu_date'],
                },
                description: 'Education entries'
              }
            },
            required: ['name', 'title', 'email', 'phone', 'location', 'summary', 'skills', 'experiences', 'education'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      return JSON.parse(result.text);
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
      if (mistralApiKey) {
        try {
          return await this.callMistral(pdfUrl, prompt, {
            name: 'string (Candidates full name)',
            title: 'string (Professional title aligned with the JD)',
            email: 'string (Contact email)',
            phone: 'string (Contact phone)',
            location: 'string (Candidate location City, State/Country)',
            linkedin: 'string (LinkedIn URL or other link)',
            summary: 'string (Tailored 2-3 sentence professional summary)',
            skills: 'string (Comma-separated list of technologies and skills)',
            experiences: [
              {
                job_title: 'string (Job title / role)',
                company: 'string (Company name)',
                job_dates: 'string (Dates worked e.g., June 2022 - Present)',
                job_location: 'string (Job location City, State)',
                job_bullet_1: 'string (First optimized bullet point)',
                job_bullet_2: 'string (Second optimized bullet point)',
                job_bullet_3: 'string (Third optimized bullet point)'
              }
            ],
            education: [
              {
                degree: 'string (Degree received)',
                institution: 'string (University/College name)',
                edu_date: 'string (Graduation date or range)',
                edu_location: 'string (School location)'
              }
            ]
          });
        } catch (mistralError: any) {
          throw new BadRequestException(`Both Gemini and Mistral fallback failed. Gemini Error: ${errorMessage}. Mistral Error: ${mistralError?.message}`);
        }
      }
      if (errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
        throw new BadRequestException('Our AI servers are experiencing a high demand. Please try again later.');
      }
      throw new BadRequestException('AI CV Tailoring failed. Please try again.');
    }
  }

  private async callMistral(pdfUrl: string, prompt: string, schema: any): Promise<any> {
    const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
    if (!mistralApiKey) {
      throw new Error('MISTRAL_API_KEY is not configured in environment.');
    }

    // 1. Perform OCR using Mistral OCR API
    let extractedText = '';
    try {
      const ocrResponse = await axios.post(
        'https://api.mistral.ai/v1/ocr',
        {
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: pdfUrl,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralApiKey}`,
          },
        }
      );

      if (ocrResponse.data?.pages && ocrResponse.data.pages.length > 0) {
        extractedText = ocrResponse.data.pages.map((p: any) => p.markdown || p.text || '').join('\n');
      } else {
        throw new Error('No text content could be extracted from the PDF.');
      }
    } catch (ocrError: any) {
      const details = ocrError?.response?.data?.message || ocrError?.message || String(ocrError);
      throw new Error(`Mistral OCR Service error: ${details}`);
    }

    // 2. Call Chat Completion to process the extracted text with JSON response format
    try {
      const systemPrompt = `
        You are an expert technical recruiter and resume analyzer.
        You must analyze the text of the candidate's resume and return a valid JSON object matching the requested schema.
        Do not include any explanation, markdown formatting blocks (like \`\`\`json), or text outside the JSON object.
        
        Expected Schema structure:
        ${JSON.stringify(schema, null, 2)}
      `;

      const chatResponse = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Resume text:\n${extractedText}\n\nTask instructions:\n${prompt}\n\nStrictly return ONLY a valid JSON object matching the schema.`,
            },
          ],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralApiKey}`,
          },
        }
      );

      const content = chatResponse.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response received from Mistral Chat Completions.');
      }

      return JSON.parse(content);
    } catch (chatError: any) {
      const details = chatError?.response?.data?.message || chatError?.message || String(chatError);
      throw new Error(`Mistral Chat Completion error: ${details}`);
    }
  }
}
