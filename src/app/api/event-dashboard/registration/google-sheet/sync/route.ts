import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';
import {
  parseCSVRegistrations,
  extractGoogleSheetId,
  normalizePhoneNumber,
  getDigitsOnlyPhone,
} from '@/lib/registration-export';

async function fetchSheetCSV(sheetId: string): Promise<{ ok: boolean; csvText: string; error?: string }> {
  const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${Date.now()}`;

  try {
    const response = await fetch(csvExportUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (
      !response.ok ||
      (response.redirected && response.url.includes('accounts.google.com')) ||
      contentType.includes('text/html')
    ) {
      return {
        ok: false,
        csvText: '',
        error: "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
      };
    }

    const csvText = await response.text();

    if (
      !csvText ||
      csvText.includes('<!DOCTYPE html') ||
      csvText.includes('<html') ||
      csvText.includes('google-site-verification')
    ) {
      return {
        ok: false,
        csvText: '',
        error: "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
      };
    }

    return { ok: true, csvText };
  } catch (err: any) {
    return {
      ok: false,
      csvText: '',
      error: "Couldn't access this sheet — make sure sharing is set to 'Anyone with the link can view'",
    };
  }
}

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
      // 1. Get stored google_sheet_url and event info
      const eventRes = await client.query(
        `SELECT id, name, google_sheet_url FROM public.events WHERE id = $1`,
        [session.eventId]
      );

      if (eventRes.rows.length === 0 || !eventRes.rows[0].google_sheet_url) {
        return NextResponse.json(
          { error: 'No Google Sheet connected. Please connect a Google Sheet first.' },
          { status: 400 }
        );
      }

      const eventInfo = eventRes.rows[0];
      const googleSheetUrl = eventInfo.google_sheet_url;
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

      // 2. Fetch CSV with cache buster & automatic retry mechanism
      let fetchResult = await fetchSheetCSV(sheetId);

      if (!fetchResult.ok || !fetchResult.csvText.trim()) {
        console.warn(`[GOOGLE SHEET SYNC] Initial fetch failed/empty. Retrying after 500ms...`);
        await new Promise((r) => setTimeout(r, 500));
        fetchResult = await fetchSheetCSV(sheetId);
      }

      if (!fetchResult.ok) {
        return NextResponse.json({ error: fetchResult.error }, { status: 400 });
      }

      // 3. Parse CSV rows
      let parseResult = parseCSVRegistrations(fetchResult.csvText);

      // If suspicious empty parse, retry once more
      if (parseResult.totalDataRowsCount === 0 && parseResult.errors.length === 0) {
        console.warn(`[GOOGLE SHEET SYNC] Parsed 0 rows. Retrying fetch...`);
        await new Promise((r) => setTimeout(r, 500));
        fetchResult = await fetchSheetCSV(sheetId);
        if (fetchResult.ok) {
          parseResult = parseCSVRegistrations(fetchResult.csvText);
        }
      }

      const { validRows, errors: parseErrors, totalDataRowsCount } = parseResult;

      // 4. Fetch existing registrations in DB for deduplication
      const dbCountRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM public.registrations WHERE event_id = $1`,
        [session.eventId]
      );
      const existingDBCount = dbCountRes.rows[0]?.count || 0;

      const existingRes = await client.query(
        `SELECT lower(email) AS email, phone_number FROM public.registrations WHERE event_id = $1`,
        [session.eventId]
      );

      const existingEmails = new Set<string>();
      const existingPhoneDigits = new Set<string>();
      const existingRawPhones = new Set<string>();

      for (const row of existingRes.rows) {
        if (row.email) existingEmails.add(row.email.trim().toLowerCase());
        if (row.phone_number) {
          existingRawPhones.add(row.phone_number.trim());
          const digits = getDigitsOnlyPhone(row.phone_number);
          if (digits) existingPhoneDigits.add(digits);
        }
      }

      // Determine display name of creator
      let creatorName = 'Google Sheet Sync';
      if (session.role === 'event_admin') {
        creatorName = 'Event Admin (Google Sync)';
      }

      await client.query('BEGIN');
      let newCount = 0;
      let duplicateEmailCount = 0;
      let duplicatePhoneCount = 0;
      let duplicateTotalCount = 0;

      for (const row of validRows) {
        const cleanEmail = (row.email || '').trim().toLowerCase();
        const cleanPhone = normalizePhoneNumber(row.phone_number);
        const phoneDigits = getDigitsOnlyPhone(row.phone_number);

        let isDuplicateByEmail = false;
        let isDuplicateByPhone = false;

        if (cleanEmail && existingEmails.has(cleanEmail)) {
          isDuplicateByEmail = true;
        }

        if (
          (cleanPhone && existingRawPhones.has(cleanPhone)) ||
          (phoneDigits && existingPhoneDigits.has(phoneDigits))
        ) {
          isDuplicateByPhone = true;
        }

        if (isDuplicateByEmail) {
          duplicateEmailCount++;
          duplicateTotalCount++;
          continue;
        }

        if (isDuplicateByPhone && !cleanEmail) {
          duplicatePhoneCount++;
          duplicateTotalCount++;
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
            cleanPhone || row.phone_number.trim(),
            row.gender || 'Other',
            row.age || 0,
            cleanEmail,
            session.email,
            creatorName,
          ]
        );

        if (cleanEmail) existingEmails.add(cleanEmail);
        if (cleanPhone) existingRawPhones.add(cleanPhone);
        if (phoneDigits) existingPhoneDigits.add(phoneDigits);
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

      const newTotalDBCount = existingDBCount + newCount;
      const invalidCount = parseErrors.length;

      // --- SERVER SIDE LOGGING FOR SYNC DIAGNOSTICS ---
      console.log(`\n================================================================`);
      console.log(`[GOOGLE SHEET SYNC LOG] Event Name: "${eventInfo.name}" (${session.eventId})`);
      console.log(`[GOOGLE SHEET SYNC LOG] Google Sheet ID: ${sheetId}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Total Data Rows in Google Sheet: ${totalDataRowsCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Valid Parsed Rows: ${validRows.length}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Invalid Rows Count: ${invalidCount}`);
      if (invalidCount > 0) {
        parseErrors.forEach((err) => {
          console.log(`[GOOGLE SHEET SYNC LOG]   - Invalid Row Detail: ${err}`);
        });
      }
      console.log(`[GOOGLE SHEET SYNC LOG] DB Registrations BEFORE Sync: ${existingDBCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Duplicates Matched by Email: ${duplicateEmailCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Duplicates Matched by Phone: ${duplicatePhoneCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] Total Duplicates Skipped: ${duplicateTotalCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] New Registrations Inserted: ${newCount}`);
      console.log(`[GOOGLE SHEET SYNC LOG] DB Registrations AFTER Sync: ${newTotalDBCount}`);
      console.log(`================================================================\n`);

      let summaryMessage = `${newCount} new registration${newCount === 1 ? '' : 's'} added, ${duplicateTotalCount} already existed (${duplicateEmailCount} by email, ${duplicatePhoneCount} by phone).`;
      if (invalidCount > 0) {
        summaryMessage = `${newCount} new added, ${duplicateTotalCount} already existed (${duplicateEmailCount} by email, ${duplicatePhoneCount} by phone), ${invalidCount} skipped due to invalid data.`;
      }

      return NextResponse.json({
        success: true,
        totalSheetRows: totalDataRowsCount,
        newCount,
        skippedCount: duplicateTotalCount,
        duplicateEmailCount,
        duplicatePhoneCount,
        invalidCount,
        invalidReasons: parseErrors,
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
