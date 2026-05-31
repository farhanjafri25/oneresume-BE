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
      1. Overall match score (0-100). Be realistic, strict, and objective (like a professional ATS scanner).
      2. Matching skills found in both the resume and the JD.
      3. Missing skills or keywords mentioned in the JD but not found in the resume.
      4. A brief, encouraging executive summary of the alignment.
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
        throw new Error('Empty response received from Gemini.');
      }
      return JSON.parse(result.text);
    } catch (e: any) {
      throw new BadRequestException(`Gemini CV Analysis failed: ${e?.message || e}`);
    }
  }
}
