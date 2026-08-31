import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';
import { extractGoogleSheetId } from '@/lib/registration-export';

// POST /api/event-dashboard/registration/google-sheet - Connect or Update Google Sheet URL
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can manage Google Sheet integration.' },
        { status: 403 }
      );
    }

    const { url } = await req.json();

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid Google Sheet shareable URL.' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    const sheetId = extractGoogleSheetId(trimmedUrl);

    if (!sheetId) {
      return NextResponse.json(
        {
          error:
            'Invalid Google Sheets URL format. Please paste a valid Google Sheet link (e.g. https://docs.google.com/spreadsheets/d/...)',
        },
        { status: 400 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(
        `UPDATE public.events
         SET google_sheet_url = $1, updated_at = NOW()
         WHERE id = $2`,
        [trimmedUrl, session.eventId]
      );

      return NextResponse.json({
        success: true,
        googleSheetUrl: trimmedUrl,
        message: 'Google Sheet connected successfully.',
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/google-sheet POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save Google Sheet URL' },
      { status: 500 }
    );
  }
}

// DELETE /api/event-dashboard/registration/google-sheet - Disconnect Google Sheet
export async function DELETE(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can manage Google Sheet integration.' },
        { status: 403 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      await client.query(
        `UPDATE public.events
         SET google_sheet_url = NULL, google_sheet_last_synced_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [session.eventId]
      );

      return NextResponse.json({
        success: true,
        message: 'Google Sheet disconnected successfully.',
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/google-sheet DELETE Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to disconnect Google Sheet' },
      { status: 500 }
    );
  }
}
