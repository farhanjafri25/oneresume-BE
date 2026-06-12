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
      You are an expert technical recruiter and senior ATS optimization specialist.

      **Step 1: JD Validation**
      - A valid Job Description must contain concrete job details: responsibilities, requirements, qualifications, skills, experience level, or role expectations.
      - If the text is extremely short (< 5 meaningful words), placeholder ("test", "this is a jd", "hello", etc.), or lacks actual job content, set "isValidJd": false, "score": 0, and explain in "summary". Leave other arrays empty.

      Job Description:
      ${jd}

      **Step 2: Resume vs JD Evaluation** (only if valid)

      Analyze the attached resume PDF against the Job Description above.

      **Strict Scoring Rules** (start at 100, deduct rigorously):
      - Deduct 12-18 points for each critical required skill/technology missing from the resume.
      - Deduct 10-15 points if years of experience or seniority level significantly mismatch.
      - Deduct 8-12 points for missing key certifications, education, or domain knowledge mentioned in JD.
      - Deduct 5-10 points for weak keyword alignment or low density of JD-relevant terms.
      - Deduct 5 points for structural issues that hurt ATS parsing (multi-column, tables, graphics, etc.).
      - Scores above 80 = very strong match. 60-79 = good but with gaps. 40-59 = moderate. Below 40 = weak match.

      **Output ONLY valid JSON** with this exact structure:
      {
        "isValidJd": boolean,
        "score": integer (0-100),
        "summary": "2-3 sentence executive summary of overall fit, highlighting strongest alignments and biggest gaps.",
        "matchingSkills": ["List of important skills/tools that appear in BOTH resume and JD"],
        "missingSkills": ["Important skills/requirements from JD that are missing or weak in resume"],
        "recommendations": [
          "Actionable bullet 1 - be specific (e.g. 'Add experience with Kafka in your current role bullets')",
          "Actionable bullet 2",
          ...
        ]
      }
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
              isValidJd: { type: Type.BOOLEAN, description: 'True if the JD is valid, false if it is gibberish, too short, placeholder text, or invalid' },
              score: { type: Type.INTEGER, description: 'ATS match score from 0 to 100' },
              summary: { type: Type.STRING, description: '2-3 sentence executive alignment summary, or explanation of invalid JD' },
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
            required: ['isValidJd', 'score', 'summary', 'matchingSkills', 'missingSkills', 'recommendations'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      const parsedResult = JSON.parse(result.text);
      if (parsedResult.isValidJd === false) {
        throw new BadRequestException('The provided text does not appear to be a valid job description. Please paste actual details, requirements, or responsibilities of the job.');
      }
      return parsedResult;
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      const errorMessage = e?.message || String(e);
      const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
      if (mistralApiKey) {
        try {
          const parsed = await this.callMistral(pdfUrl, prompt, {
            isValidJd: 'boolean (true if the JD is valid, false if it is gibberish, too short, placeholder text, or invalid)',
            score: 'integer (ATS match score from 0 to 100)',
            summary: 'string (2-3 sentence executive alignment summary, or explanation of invalid JD)',
            matchingSkills: 'array of strings (key matching skills found)',
            missingSkills: 'array of strings (important skills/keywords mentioned in JD but missing in CV)',
            recommendations: 'array of strings (step-by-step actionable recommendations to optimize the CV)'
          });
          if (parsed.isValidJd === false) {
            throw new BadRequestException('The provided text does not appear to be a valid job description. Please paste actual details, requirements, or responsibilities of the job.');
          }
          return parsed;
        } catch (mistralError: any) {
          if (mistralError instanceof BadRequestException) {
            throw mistralError;
          }
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
      You are an expert technical recruiter and senior ATS optimization specialist with deep knowledge of modern Applicant Tracking Systems (Workday, Taleo, Greenhouse, Lever, iCIMS, etc.) in 2026.

      Analyze the attached candidate resume PDF **strictly for general ATS compatibility and structural quality**. Be extremely critical, objective, and evidence-based. Do not hallucinate content.

      **Scoring Rules (start at 100 and deduct strictly):**
      - Deduct 20 points for any major parsing risks: multi-column layouts, complex tables, text boxes, graphics/images with text, headers/footers, non-standard fonts, or unusual section headings.
      - Deduct 15 points for weak or absent quantifiable achievements in experience bullets (lack of metrics like %, numbers, $ values, user growth, efficiency gains, etc.).
      - Deduct 10 points for low usage of strong action verbs (aim for 15+ impactful ones across the resume).
      - Deduct 10 points for missing or incomplete contact info (full name, professional email, phone, LinkedIn URL, location).
      - Deduct 5-10 points for poor keyword strategy: low density of common industry skills/tools or vague language.
      - Deduct 5 points for other issues: excessive length (>2 pages for most roles), inconsistent formatting, or poor readability.
      - Reserve 90+ only for near-perfect, clean, metric-heavy resumes using standard structures. Excellent real-world resumes typically land 75-88. Generic or poorly formatted ones score 40-65.

      **Output ONLY valid JSON** matching this exact schema (no extra text):

      {
        "score": integer (0-100),
        "summary": "2-3 sentence executive summary highlighting the biggest strengths and most critical weaknesses for ATS passage and recruiter appeal.",
        "parsability": "Status (Excellent / Good / Needs Work / Poor) - short explanation of parsing risks and how the resume would fare in common ATS parsers.",
        "formatting": "Status (e.g., Good - 92%) - detailed analysis of section headers, layout, bullet usage, fonts, and standard compliance.",
        "actionVerbs": "Analysis including approximate count of strong verbs and impact examples/quotes.",
        "missingContactInfo": "Completeness check: list what is present/missing (Email, Phone, LinkedIn, etc.).",
        "keywordReadiness": "Assessment of skill density, common technical keywords, and suggestions for improvement (general, not job-specific).",
        "keyImprovements": ["Bullet-point list of the top 4-6 prioritized, actionable recommendations to boost the ATS score and human appeal."]
      }
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
              score: { type: Type.INTEGER, description: 'ATS parsability score from 0 to 100' },
              summary: { type: Type.STRING, description: '2-3 sentence executive summary of strengths and weaknesses' },
              parsability: { type: Type.STRING, description: 'Parsability status and explanation of parsing risks' },
              formatting: { type: Type.STRING, description: 'Section formatting status and explanation' },
              actionVerbs: { type: Type.STRING, description: 'Analysis of action verbs used' },
              missingContactInfo: { type: Type.STRING, description: 'Contact information completeness' },
              keywordReadiness: { type: Type.STRING, description: 'Skill density and keyword strategy assessment' },
              keyImprovements: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: 'List of top prioritized actionable improvements' 
              },
            },
            required: ['score', 'summary', 'parsability', 'formatting', 'actionVerbs', 'missingContactInfo', 'keywordReadiness', 'keyImprovements'],
          },
        },
      });

      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      return JSON.parse(result.text);
    } catch (e: any) {
      console.log(`inside catch block for generalResumeScan. Error: ${e}`);
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
            missingContactInfo: 'string (contact info completeness)',
            keywordReadiness: 'string (skill density and keyword strategy assessment)',
            keyImprovements: 'array of strings (list of top prioritized actionable improvements)'
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
      You are an expert technical resume writer and career coach specialized in ATS-optimized resumes.

      **Step 1: JD Validation**
      Analyze the provided Job Description.
      - A valid JD must contain concrete details: responsibilities, requirements, qualifications, skills, or role expectations.
      - If the text is extremely short (< 4-5 meaningful words), placeholder ("this is a jd", "test", "hello", etc.), or lacks any actual job content, set "isValidJd": false.
      - If invalid, set "isValidJd": false and return empty strings/arrays for all other fields.

      **Step 2: Resume Analysis & Tailoring** (only if JD is valid)

      You are given a candidate's resume PDF and a valid Job Description.

      Job Description:
      ${jd}

      **Strict Rules:**
      - Never fabricate experience, achievements, or skills. Only rephrase and emphasize what actually exists in the resume.
      - Prioritize honest alignment with the JD using real content from the resume.
      - Use strong action verbs and quantify achievements where possible.
      - Optimize for ATS: standard section headings, natural keyword integration from the JD.

      **Output ONLY valid JSON** matching this schema:

      {
        "isValidJd": boolean,
        "name": "Full name exactly as in resume",
        "title": "Best professional title aligned with the JD",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "summary": "2-4 sentence high-impact professional summary tailored to the JD. Make it engaging and keyword-rich.",
        "skills": "Comma-separated list of the most relevant skills/tools (from resume + JD match), max 18 items",
        "experiences": [
          {
            "job_title": "",
            "company": "",
            "job_dates": "",
            "job_location": "",
            "job_bullet_1": "",
            "job_bullet_2": "",
            "job_bullet_3": "",
            "job_bullet_4": "",   // optional, include only if strong content exists
            "job_bullet_5": ""    // optional
          }
        ],
        "education": [
          {
            "degree": "",
            "institution": "",
            "edu_date": "",
            "edu_location": ""
          }
        ]
      }
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
              isValidJd: { type: Type.BOOLEAN, description: 'True if the JD is valid, false if invalid' },
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
                    job_bullet_4: { type: Type.STRING, description: 'Fourth optimized bullet point (optional)' },
                    job_bullet_5: { type: Type.STRING, description: 'Fifth optimized bullet point (optional)' },
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
            required: ['isValidJd', 'name', 'title', 'email', 'phone', 'location', 'summary', 'skills', 'experiences', 'education'],
          },
        },
      });
 
      if (!result.text) {
        throw new Error('Empty response received from AI service.');
      }
      const parsedResult = JSON.parse(result.text);
      if (parsedResult.isValidJd === false) {
        throw new BadRequestException('The provided text does not appear to be a valid job description. Please paste actual details, requirements, or responsibilities of the job.');
      }
      return parsedResult;
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      const errorMessage = e?.message || String(e);
      const mistralApiKey = this.config.get<string>('MISTRAL_API_KEY');
      if (mistralApiKey) {
        try {
          const parsed = await this.callMistral(pdfUrl, prompt, {
            isValidJd: 'boolean (true if the JD is valid, false if invalid)',
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
                job_bullet_3: 'string (Third optimized bullet point)',
                job_bullet_4: 'string (Fourth optimized bullet point, optional)',
                job_bullet_5: 'string (Fifth optimized bullet point, optional)'
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
          if (parsed.isValidJd === false) {
            throw new BadRequestException('The provided text does not appear to be a valid job description. Please paste actual details, requirements, or responsibilities of the job.');
          }
          return parsed;
        } catch (mistralError: any) {
          if (mistralError instanceof BadRequestException) {
            throw mistralError;
          }
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
