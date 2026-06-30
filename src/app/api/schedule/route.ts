import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const { tasks } = await request.json();
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ success: true, order: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert AI productivity planner.
Given this list of user tasks:
${JSON.stringify(tasks)}

Rearrange and prioritize these tasks to determine the optimal schedule (which tasks to tackle first, next, and last) based on their urgency (HIGH, MEDIUM, LOW), deadlines, and estimated hours.
Return a JSON array of task IDs in the recommended order.
Example response:
["task-1", "task-2", "task-3"]`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array' as any,
          items: { type: 'string' as any }
        }
      }
    });

    const resultText = aiResponse.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini');
    }

    let cleanJson = resultText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    
    const orderedIds = JSON.parse(cleanJson);
    if (!Array.isArray(orderedIds)) {
      throw new Error('Gemini response is not an array');
    }

    return NextResponse.json({
      success: true,
      order: orderedIds
    });

  } catch (error: any) {
    console.error('Error in AI schedule route:', error);
    // On fallback, sort tasks by urgency score (HIGH first, then MEDIUM, then LOW)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate AI schedule'
    }, { status: 200 });
  }
}
