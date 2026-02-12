import { createClient } from '@/utils/supabase/server'; // your server client (able to manage cookies)
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType;

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/dashboard/signin?error=auth', request.url)
    );
  }

  const supabase = createClient();

  try {
    const { data, error } = await (await supabase).auth.verifyOtp({
      type,
      token_hash
    });

    if (error) throw error;
    if (!data.session) throw new Error('No session returned');

    const response = NextResponse.redirect(
      new URL('/update-password', request.url)
    );

    response.cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' // lowercase 'lax'
    });

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' // lowercase 'lax'
    });

    return response;
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/signin?error=${error.message}`, request.url)
    );
  }
}
