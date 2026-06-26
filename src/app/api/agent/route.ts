import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Type definitions matching our frontend Task interface
interface TaskResponse {
  title: string;
  description: string;
  urgencyScore: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedHours: number;
  immediateFirstStep: string;
  actionableChecklist: string[];
  deadline: string;
}

interface ParseRequest {
  taskInput: string;
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are an elite task planning coordinator at Firefly AI, an autonomous productivity agent designed to prevent missed deadlines.

Your role: Parse messy, chaotic, or unstructured text (emails, meeting notes, verbal thoughts, brain dumps) and distill them into highly structured execution plans.

CRITICAL RULES:
1. Always extract the PRIMARY actionable task - ignore secondary or background information
2. Urgency scoring follows strict criteria:
   - HIGH: Time-sensitive, involves other people, has hard deadline within 48 hours
   - MEDIUM: Important but not immediate, can wait 3-7 days, impacts workflow
   - LOW: Important but not urgent, long-term, self-contained, no external dependencies
3. Immediate first step MUST be a concrete 5-minute action - something so small it eliminates procrastination
4. Actionable checklist should be linear, sequential milestones - each should be 15-60 minutes of work
5. Deadline must be realistic and consider the estimated hours and current urgency

Always output JSON matching this exact schema:
{
  "title": "Main name of the primary task extracted",
  "description": "Detailed breakdown of the issue context",
  "urgencyScore": "HIGH|MEDIUM|LOW",
  "estimatedHours": number,
  "immediateFirstStep": "The ultra-accessible 5-minute action step",
  "actionableChecklist": ["linear sub-milestone 1", "sub-milestone 2", ...],
  "deadline": "ISO 8601 timestamp (e.g., 2024-12-31T23:59:59.999Z)"
}`;

// Validation function for the response
function validateTaskResponse(data: any): data is TaskResponse {
  if (!data || typeof data !== 'object') return false;
  
  const required = [
    'title', 'description', 'urgencyScore', 'estimatedHours', 
    'immediateFirstStep', 'actionableChecklist', 'deadline'
  ];
  
  for (const key of required) {
    if (!(key in data)) return false;
  }
  
  // Type-specific validations
  if (typeof data.title !== 'string' || data.title.trim() === '') return false;
  if (typeof data.description !== 'string' || data.description.trim() === '') return false;
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(data.urgencyScore)) return false;
  if (typeof data.estimatedHours !== 'number' || data.estimatedHours <= 0) return false;
  if (typeof data.immediateFirstStep !== 'string' || data.immediateFirstStep.trim() === '') return false;
  if (!Array.isArray(data.actionableChecklist) || data.actionableChecklist.length === 0) return false;
  if (typeof data.deadline !== 'string' || data.deadline.trim() === '') return false;
  
  // Validate checklist items are strings
  if (!data.actionableChecklist.every((item: any) => typeof item === 'string' && item.trim() !== '')) return false;
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable not set');
      return NextResponse.json(
        { error: 'AI service configuration error. GEMINI_API_KEY is required.' },
        { status: 500 }
      );
    }

    // Parse request body
    let body: ParseRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body.taskInput || typeof body.taskInput !== 'string' || body.taskInput.trim() === '') {
      return NextResponse.json(
        { error: 'taskInput is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Initialize Google AI client
    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare the prompt
    const userPrompt = `CHAOS DUMP TO PARSE:
${body.taskInput}

Please analyze this text and extract a structured task plan according to the rules above.`;

    console.log(`Processing chaos dump of ${body.taskInput.length} characters`);

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: userPrompt }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object' as any,
          properties: {
            title: { type: 'string' as any },
            description: { type: 'string' as any },
            urgencyScore: { type: 'string' as any, enum: ['HIGH', 'MEDIUM', 'LOW'] },
            estimatedHours: { type: 'number' as any },
            immediateFirstStep: { type: 'string' as any },
            actionableChecklist: { type: 'array' as any, items: { type: 'string' as any } },
            deadline: { type: 'string' as any }
          },
          required: [
            'title', 'description', 'urgencyScore', 'estimatedHours', 
            'immediateFirstStep', 'actionableChecklist', 'deadline'
          ]
        }
      }
    });

    // Parse the response
    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from AI model');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', resultText);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate the response structure
    if (!validateTaskResponse(parsedData)) {
      console.error('Invalid task response structure:', parsedData);
      throw new Error('AI response does not match expected schema');
    }

    // Ensure deadline is a valid ISO timestamp
    let deadlineDate: Date;
    try {
      deadlineDate = new Date(parsedData.deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (dateError) {
      // If deadline is invalid, generate a reasonable default (7 days from now)
      deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7);
      parsedData.deadline = deadlineDate.toISOString();
    }

    // Ensure estimatedHours is reasonable
    if (parsedData.estimatedHours > 100) {
      parsedData.estimatedHours = Math.min(parsedData.estimatedHours, 100);
    }

    // Ensure checklist has at least 2 items
    if (parsedData.actionableChecklist.length < 2) {
      parsedData.actionableChecklist = [
        'Review and refine the task scope',
        'Break down into specific action items',
        ...parsedData.actionableChecklist
      ].slice(0, 5);
    }

    console.log(`Successfully parsed task: ${parsedData.title} (${parsedData.urgencyScore} urgency)`);

    // Return the structured task
    return NextResponse.json({
      success: true,
      task: parsedData,
      metadata: {
        parsedFromCharacters: body.taskInput.length,
        responseTime: Date.now(),
        model: 'gemini-1.5-flash'
      }
    });

  } catch (error: any) {
    console.error('Error in agent API:', error);

    // Handle specific error types
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid or missing Google AI Studio API key' },
        { status: 401 }
      );
    }

    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please check your Google AI Studio usage.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to process task input',
        details: error.message || 'Unknown error',
        suggestion: 'Please try again with more specific task details'
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing/health check
export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Firefly AI Agent Parser',
    model: 'gemini-1.5-flash',
    capabilities: [
      'Parse chaotic text into structured tasks',
      'Determine task urgency (HIGH/MEDIUM/LOW)',
      'Generate immediate 5-minute first steps',
      'Create actionable checklists',
      'Set realistic deadlines'
    ],
    required: 'POST with { "taskInput": "your chaotic text here" }',
    environment: process.env.GEMINI_API_KEY ? 'API key configured' : 'API key missing'
  });
}

// Type exports for frontend consumption
export type { TaskResponse, ParseRequest };