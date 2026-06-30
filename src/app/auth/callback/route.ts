import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Exchange oauth code for user session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging oauth code for session:', error.message);
    } else if (data?.session) {
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;
      const userId = data.session.user.id;

      console.log('🔄 OAuth Code Exchange Success for user:', userId);

      // Save Google tokens in the user_google_tokens table
      if (providerToken && providerRefreshToken) {
        console.log('💾 Saving Google tokens to user_google_tokens table...');
        const { error: upsertError } = await supabase
          .from('user_google_tokens')
          .upsert({
            user_id: userId,
            access_token: providerToken,
            refresh_token: providerRefreshToken,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });

        if (upsertError) {
          console.error('Error saving google oauth tokens to DB:', upsertError.message);
        }
      }
    }
  }

  // Redirect user to the dashboard homepage
  return NextResponse.redirect(requestUrl.origin);
}
