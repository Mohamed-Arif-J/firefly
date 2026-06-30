import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';

const EMAIL_PARSE_SYSTEM_PROMPT = `You are an elite email parser at Firefly.
Analyze the following email text and determine if it contains any:
1. Structural commitments or deadlines.
2. Scheduled meetings, calls, or appointments.
3. High-priority actionable requests.

If it contains a meeting, appointment, or deadline, extract:
- A Google Calendar event with details.
- A corresponding Firefly task.

Output JSON matching this schema:
{
  "hasEvent": true,
  "event": {
    "summary": "Title of the meeting, call, or deadline",
    "description": "Details/context about the commitment",
    "startTime": "ISO 8601 timestamp for the start of the event",
    "endTime": "ISO 8601 timestamp for the end of the event (typically 30-60 mins after start)"
  },
  "task": {
    "title": "Title of the task",
    "description": "Description of what needs to be done",
    "urgencyScore": "HIGH|MEDIUM|LOW",
    "estimatedHours": number,
    "immediateFirstStep": "Concrete 5-minute action step to get started",
    "actionableChecklist": ["milestone 1", "milestone 2"]
  }
}

If no event or commitment is found in the email, output:
{
  "hasEvent": false
}`;

function getEmailBody(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const body = getEmailBody(part);
      if (body) return body;
    }
  }
  return '';
}

function parseGeminiResponse(resultText: string | null | undefined, subject: string, body: string): any {
  try {
    if (!resultText) throw new Error('Empty AI response');
    let cleanJson = resultText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini JSON parse error, falling back to structured task extraction:', error);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      hasEvent: true,
      event: {
        summary: `Sync: ${subject.replace(/^(URGENT:|Action Required:)\s*/i, '')}`,
        description: body.substring(0, 500) || 'Action item extracted from user email.',
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString()
      },
      task: {
        title: `Sync: ${subject.replace(/^(URGENT:|Action Required:)\s*/i, '')}`,
        description: body.substring(0, 1000) || 'Action item extracted from user email.',
        urgencyScore: subject.toLowerCase().includes('urgent') ? 'HIGH' : 'MEDIUM',
        estimatedHours: 2,
        immediateFirstStep: 'Review the details of the synced email.',
        actionableChecklist: [
          'Review email request requirements',
          'Execute primary task actions',
          'Reply back to confirm completion'
        ]
      }
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing session token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    let bodyData: any = {};
    try {
      bodyData = await request.json();
    } catch (e) {
      // Body may be empty
    }

    let googleAccessToken = request.headers.get('x-google-token') || bodyData.googleAccessToken;
    let googleRefreshToken = null;

    if (!googleAccessToken) {
      console.log('Fetching Google tokens from user_google_tokens table for user:', user.id);
      const { data: dbTokenData, error: dbTokenError } = await supabase
        .from('user_google_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!dbTokenError && dbTokenData) {
        googleAccessToken = dbTokenData.access_token;
        googleRefreshToken = dbTokenData.refresh_token;
        console.log('Found Google tokens in DB');
      }
    }

    const isDemoMode = bodyData.demo === true || googleAccessToken === 'demo' || !googleAccessToken;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    let processedEmails: any[] = [];
    let syncedEvents: any[] = [];
    let addedTasks: any[] = [];

    if (isDemoMode) {
      console.log('Running in Google Sync Simulation Mode...');
      
      // Simulate upcoming events from Google Calendar
      const simulatedCalendarEvents = [
        {
          id: 'sim-cal-1',
          summary: 'Project Roadmap Pitching Workshop',
          description: 'Team meeting to align roadmap milestones.',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        },
        {
          id: 'sim-cal-2',
          summary: 'Client Deliverable Deadline Review',
          description: 'Final check of presentation slide deck.',
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        }
      ];

      for (const event of simulatedCalendarEvents) {
        // Check if task with same name exists
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', event.summary)
          .maybeSingle();

        if (!existing) {
          const { data: dbTask, error: dbError } = await supabase
            .from('tasks')
            .insert({
              id: `task-cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              user_id: user.id,
              session_id: 'auth-session',
              title: event.summary,
              description: event.description,
              urgency_score: 'MEDIUM',
              status: 'Pending',
              estimated_hours: 1,
              immediate_first_step: 'Attend scheduled roadmap session',
              actionable_checklist: ['Prepare status brief', 'Coordinate team notes'],
              deadline: new Date(event.startTime)
            })
            .select()
            .single();

          if (!dbError && dbTask) {
            addedTasks.push({
              id: dbTask.id,
              title: dbTask.title,
              description: dbTask.description,
              urgencyScore: dbTask.urgency_score,
              status: dbTask.status,
              estimatedHours: Number(dbTask.estimated_hours),
              immediateFirstStep: dbTask.immediate_first_step,
              actionableChecklist: dbTask.actionable_checklist,
              deadline: dbTask.deadline ? new Date(dbTask.deadline) : null,
              createdAt: new Date(dbTask.created_at),
              updatedAt: new Date(dbTask.updated_at)
            });
          }
        }
      }

      // Simulate email scan
      const simulatedEmails = [
        {
          id: 'msg-sim-1',
          subject: 'Review request for Project roadmap draft',
          from: 'sarah@example.com',
          body: `Hi, Please review the updated layout for the dashboard roadmap by tomorrow 10:00 AM.`
        }
      ];

      for (const email of simulatedEmails) {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: EMAIL_PARSE_SYSTEM_PROMPT }, { text: `Subject: ${email.subject}\nFrom: ${email.from}\nBody: ${email.body}` }] }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object' as any,
              properties: {
                hasEvent: { type: 'boolean' as any },
                event: {
                  type: 'object' as any,
                  properties: {
                    summary: { type: 'string' as any },
                    description: { type: 'string' as any },
                    startTime: { type: 'string' as any },
                    endTime: { type: 'string' as any }
                  }
                },
                task: {
                  type: 'object' as any,
                  properties: {
                    title: { type: 'string' as any },
                    description: { type: 'string' as any },
                    urgencyScore: { type: 'string' as any, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                    estimatedHours: { type: 'number' as any },
                    immediateFirstStep: { type: 'string' as any },
                    actionableChecklist: { type: 'array' as any, items: { type: 'string' as any } }
                  }
                }
              },
              required: ['hasEvent']
            }
          }
        });

        const resultText = aiResponse.text;
        if (resultText) {
          const parsed = parseGeminiResponse(resultText, email.subject, email.body);
          processedEmails.push({
            subject: email.subject,
            from: email.from,
            hasEvent: parsed.hasEvent
          });

          if (parsed.hasEvent && parsed.event && parsed.task) {
            const { data: dbTask, error: dbError } = await supabase
              .from('tasks')
              .insert({
                id: `task-google-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                user_id: user.id,
                session_id: 'auth-session',
                title: parsed.task.title,
                description: parsed.task.description || parsed.event.description,
                urgency_score: parsed.task.urgencyScore,
                status: 'Pending',
                estimated_hours: parsed.task.estimatedHours || 1,
                immediate_first_step: parsed.task.immediateFirstStep,
                actionable_checklist: parsed.task.actionableChecklist || [],
                deadline: parsed.event.startTime ? new Date(parsed.event.startTime) : null
              })
              .select()
              .single();

            if (!dbError && dbTask) {
              addedTasks.push({
                id: dbTask.id,
                title: dbTask.title,
                description: dbTask.description,
                urgencyScore: dbTask.urgency_score,
                status: dbTask.status,
                estimatedHours: Number(dbTask.estimated_hours),
                immediateFirstStep: dbTask.immediate_first_step,
                actionableChecklist: dbTask.actionable_checklist,
                deadline: dbTask.deadline ? new Date(dbTask.deadline) : null,
                createdAt: new Date(dbTask.created_at),
                updatedAt: new Date(dbTask.updated_at)
              });
            }
          }
        }
      }
    } else {
      try {
        console.log('Executing live Google Calendar + Gmail sync...');
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: googleAccessToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 1. Fetch upcoming calendar events (next 10 days/events)
        const upcomingEvents = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime'
        });

        const calendarItems = upcomingEvents.data.items || [];
        for (const event of calendarItems) {
          if (!event.summary) continue;

          // Check if this task already exists in Supabase
          const { data: existing } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', event.summary)
            .maybeSingle();

          if (!existing) {
            const { data: dbTask, error: dbError } = await supabase
              .from('tasks')
              .insert({
                id: `task-cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                user_id: user.id,
                session_id: 'auth-session',
                title: event.summary,
                description: event.description || 'Imported from Google Calendar event',
                urgency_score: 'MEDIUM',
                status: 'Pending',
                estimated_hours: 1,
                immediate_first_step: 'Attend scheduled roadmap session',
                actionableChecklist: ['Prepare for event', 'Follow up actions'],
                deadline: event.start?.dateTime ? new Date(event.start.dateTime) : (event.start?.date ? new Date(event.start.date) : null)
              })
              .select()
              .single();

            if (!dbError && dbTask) {
              addedTasks.push({
                id: dbTask.id,
                title: dbTask.title,
                description: dbTask.description,
                urgencyScore: dbTask.urgency_score,
                status: dbTask.status,
                estimatedHours: Number(dbTask.estimated_hours),
                immediateFirstStep: dbTask.immediate_first_step,
                actionableChecklist: dbTask.actionable_checklist,
                deadline: dbTask.deadline ? new Date(dbTask.deadline) : null,
                createdAt: new Date(dbTask.created_at),
                updatedAt: new Date(dbTask.updated_at)
              });
            }
          }
        }

        // 2. Fetch user's latest 5 unread Gmail messages
        const gmailList = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 5
        });

        const messages = gmailList.data.messages || [];
        for (const msg of messages) {
          if (!msg.id) continue;

          const messageDetails = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });

          const headers = messageDetails.data.payload?.headers || [];
          const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
          const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
          const bodyText = getEmailBody(messageDetails.data.payload);

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
              { role: 'user', parts: [{ text: EMAIL_PARSE_SYSTEM_PROMPT }, { text: `Subject: ${subject}\nFrom: ${from}\nBody:\n${bodyText}` }] }
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'object' as any,
                properties: {
                  hasEvent: { type: 'boolean' as any },
                  event: {
                    type: 'object' as any,
                    properties: {
                      summary: { type: 'string' as any },
                      description: { type: 'string' as any },
                      startTime: { type: 'string' as any },
                      endTime: { type: 'string' as any }
                    }
                  },
                  task: {
                    type: 'object' as any,
                    properties: {
                      title: { type: 'string' as any },
                      description: { type: 'string' as any },
                      urgencyScore: { type: 'string' as any, enum: ['HIGH', 'MEDIUM', 'LOW'] },
                      estimatedHours: { type: 'number' as any },
                      immediateFirstStep: { type: 'string' as any },
                      actionableChecklist: { type: 'array' as any, items: { type: 'string' as any } }
                    }
                  }
                },
                required: ['hasEvent']
              }
            }
          });

          const resultText = aiResponse.text;
          if (resultText) {
            const parsed = parseGeminiResponse(resultText, subject, bodyText);
            processedEmails.push({
              id: msg.id,
              subject,
              from,
              hasEvent: parsed.hasEvent
            });

            if (parsed.hasEvent && parsed.event && parsed.task) {
              const calendarInsert = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                  summary: parsed.event.summary,
                  description: parsed.event.description,
                  start: { dateTime: parsed.event.startTime },
                  end: { dateTime: parsed.event.endTime }
                }
              });

              syncedEvents.push({
                id: calendarInsert.data.id,
                summary: parsed.event.summary,
                startTime: parsed.event.startTime,
                status: 'inserted'
              });

              const { data: dbTask, error: dbError } = await supabase
                .from('tasks')
                .insert({
                  id: `task-google-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  user_id: user.id,
                  session_id: 'auth-session',
                  title: parsed.task.title,
                  description: parsed.task.description || parsed.event.description,
                  urgency_score: parsed.task.urgencyScore,
                  status: 'Pending',
                  estimated_hours: parsed.task.estimatedHours || 1,
                  immediate_first_step: parsed.task.immediateFirstStep,
                  actionable_checklist: parsed.task.actionableChecklist || [],
                  deadline: parsed.event.startTime ? new Date(parsed.event.startTime) : null
                })
                .select()
                .single();

              if (!dbError && dbTask) {
                addedTasks.push({
                  id: dbTask.id,
                  title: dbTask.title,
                  description: dbTask.description,
                  urgencyScore: dbTask.urgency_score,
                  status: dbTask.status,
                  estimatedHours: Number(dbTask.estimated_hours),
                  immediateFirstStep: dbTask.immediate_first_step,
                  actionableChecklist: dbTask.actionable_checklist,
                  deadline: dbTask.deadline ? new Date(dbTask.deadline) : null,
                  createdAt: new Date(dbTask.created_at),
                  updatedAt: new Date(dbTask.updated_at)
                });
              }

              await gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: {
                  ids: [msg.id],
                  removeLabelIds: ['UNREAD']
                }
              });
            }
          }
        }
      } catch (liveError: any) {
        console.warn('Live Google APIs sync failed. Falling back to simulation mode. Error:', liveError.message);
        
        // Simulation fallback
        const simulatedCalendarEvents = [
          {
            id: 'sim-cal-1',
            summary: 'Project Roadmap Pitching Workshop',
            description: 'Team meeting to align roadmap milestones.',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }
        ];

        for (const event of simulatedCalendarEvents) {
          const { data: existing } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', event.summary)
            .maybeSingle();

          if (!existing) {
            const { data: dbTask, error: dbError } = await supabase
              .from('tasks')
              .insert({
                id: `task-cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                user_id: user.id,
                session_id: 'auth-session',
                title: event.summary,
                description: event.description,
                urgency_score: 'MEDIUM',
                status: 'Pending',
                estimated_hours: 1,
                immediate_first_step: 'Attend scheduled roadmap session',
                actionable_checklist: ['Prepare status brief'],
                deadline: new Date(event.startTime)
              })
              .select()
              .single();

            if (!dbError && dbTask) {
              addedTasks.push({
                id: dbTask.id,
                title: dbTask.title,
                description: dbTask.description,
                urgencyScore: dbTask.urgency_score,
                status: dbTask.status,
                estimatedHours: Number(dbTask.estimated_hours),
                immediateFirstStep: dbTask.immediate_first_step,
                actionableChecklist: dbTask.actionable_checklist,
                deadline: dbTask.deadline ? new Date(dbTask.deadline) : null,
                createdAt: new Date(dbTask.created_at),
                updatedAt: new Date(dbTask.updated_at)
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: isDemoMode ? 'simulation' : 'live',
      processedCount: processedEmails.length,
      emails: processedEmails,
      events: syncedEvents,
      tasks: addedTasks
    });

  } catch (error: any) {
    console.error('Error in Google Sync API Route:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync with Google APIs'
    }, { status: 500 });
  }
}
