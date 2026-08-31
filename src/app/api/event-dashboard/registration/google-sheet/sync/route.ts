import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';
import { parseCSVRegistrations, extractGoogleSheetId } from '@/lib/registration-export';

// POST /api/event-dashboard/registration/google-sheet/sync - Manually sync registrations from Google Sheet
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can trigger Google Sheet sync.' },
        { status: 403 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      // 1. Get stored google_sheet_url for current event
      const eventRes = await client.query(
        `SELECT google_sheet_url FROM public.events WHERE id = $1`,
        [session.eventId]
      );

      if (eventRes.rows.length === 0 || !eventRes.rows[0].google_sheet_url) {
        return NextResponse.json(
          { error: 'No Google Sheet connected. Please connect a Google Sheet first.' },
          { status: 400 }
        );
      }

      const googleSheetUrl = eventRes.rows[0].google_sheet_url;
      const sheetId = extractGoogleSheetId(googleSheetUrl);

      if (!sheetId) {
        return NextResponse.json(
          {
            error:
              "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
          },
          { status: 400 }
        );
      }

      // 2. Fetch CSV from Google Sheets public export endpoint
      const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      let response: Response;
      try {
        response = await fetch(csvExportUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          redirect: 'follow',
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error:
              "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
          },
          { status: 400 }
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (
        !response.ok ||
        response.redirected && response.url.includes('accounts.google.com') ||
        contentType.includes('text/html')
      ) {
        return NextResponse.json(
          {
            error:
              "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
          },
          { status: 400 }
        );
      }

      const csvText = await response.text();

      if (
        !csvText ||
        csvText.includes('<!DOCTYPE html') ||
        csvText.includes('<html') ||
        csvText.includes('google-site-verification')
      ) {
        return NextResponse.json(
          {
            error:
              "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
          },
          { status: 400 }
        );
      }

      // 3. Parse CSV rows
      const { validRows, errors: parseErrors } = parseCSVRegistrations(csvText);

      if (validRows.length === 0) {
        if (parseErrors.length > 0) {
          return NextResponse.json({ error: parseErrors.join(' ') }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          newCount: 0,
          skippedCount: 0,
          message: '0 new registrations added, 0 already existed (skipped).',
          lastSyncedAt: new Date().toISOString(),
        });
      }

      // 4. Fetch existing registrations for deduplication
      const existingRes = await client.query(
        `SELECT lower(email) AS email, phone_number FROM public.registrations WHERE event_id = $1`,
        [session.eventId]
      );

      const existingEmails = new Set<string>();
      const existingPhones = new Set<string>();

      for (const row of existingRes.rows) {
        if (row.email) existingEmails.add(row.email.trim().toLowerCase());
        if (row.phone_number) existingPhones.add(row.phone_number.trim());
      }

      // Determine display name of creator
      let creatorName = 'Google Sheet Sync';
      if (session.role === 'event_admin') {
        creatorName = 'Event Admin (Google Sync)';
      }

      await client.query('BEGIN');
      let newCount = 0;
      let skippedCount = 0;

      for (const row of validRows) {
        const cleanEmail = (row.email || '').trim().toLowerCase();
        const cleanPhone = (row.phone_number || '').trim();

        let isDuplicate = false;

        if (cleanEmail && existingEmails.has(cleanEmail)) {
          isDuplicate = true;
        } else if (!cleanEmail && cleanPhone && existingPhones.has(cleanPhone)) {
          isDuplicate = true;
        }

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        // Insert new registration
        await client.query(
          `INSERT INTO public.registrations (
             event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            session.eventId,
            row.full_name.trim(),
            cleanPhone,
            row.gender || 'Other',
            row.age || 0,
            cleanEmail,
            session.email,
            creatorName,
          ]
        );

        if (cleanEmail) existingEmails.add(cleanEmail);
        if (cleanPhone) existingPhones.add(cleanPhone);
        newCount++;
      }

      // 5. Update google_sheet_last_synced_at timestamp on events table
      const nowIso = new Date().toISOString();
      await client.query(
        `UPDATE public.events
         SET google_sheet_last_synced_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [session.eventId]
      );

      await client.query('COMMIT');

      const summaryMessage = `${newCount} new registration${newCount === 1 ? '' : 's'} added, ${skippedCount} already existed (skipped).`;

      return NextResponse.json({
        success: true,
        newCount,
        skippedCount,
        message: summaryMessage,
        lastSyncedAt: nowIso,
      });
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/google-sheet/sync POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sync Google Sheet registrations.' },
      { status: 500 }
    );
  }
}
