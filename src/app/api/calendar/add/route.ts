import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing session token' }, { status: 401 });
    }

    // Initialize Supabase client
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

    const { title, description, deadline } = await request.json();
    if (!title) {
      return NextResponse.json({ error: 'Missing task title' }, { status: 400 });
    }

    // Fetch Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.log('Google integration not configured or tokens not found. Skipping Google Calendar insert.');
      return NextResponse.json({ success: true, mode: 'local_only', message: 'Task created locally only (Google account not connected)' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokenData.access_token });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const eventStartTime = deadline ? new Date(deadline).toISOString() : new Date().toISOString();
    const eventEndTime = new Date(new Date(eventStartTime).getTime() + 60 * 60 * 1000).toISOString(); // 1 hour event

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || 'Created from Firefly',
        start: { dateTime: eventStartTime },
        end: { dateTime: eventEndTime }
      }
    });

    return NextResponse.json({
      success: true,
      mode: 'google',
      eventId: response.data.id,
      message: 'Successfully added task to Google Calendar'
    });

  } catch (error: any) {
    console.error('Error in Google Calendar event add:', error);
    // Return 200 with fallback indicator so the UI doesn't crash on auth token expiration
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add event to Google Calendar'
    }, { status: 200 });
  }
}
