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

// POST /api/event-dashboard/registration/google-sheet/verify - Audit Google Sheet against DB Registrations
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can trigger sync verification.' },
        { status: 403 }
      );
    }

    const client = getPgClient();
    await client.connect();

    try {
      // 1. Fetch connected google_sheet_url for event
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

      // 2. Fetch CSV with cache buster
      let fetchResult = await fetchSheetCSV(sheetId);
      if (!fetchResult.ok || !fetchResult.csvText.trim()) {
        await new Promise((r) => setTimeout(r, 500));
        fetchResult = await fetchSheetCSV(sheetId);
      }

      if (!fetchResult.ok) {
        return NextResponse.json({ error: fetchResult.error }, { status: 400 });
      }

      // 3. Parse CSV rows
      const parseResult = parseCSVRegistrations(fetchResult.csvText);
      const { validRows, totalDataRowsCount } = parseResult;

      // 4. Query existing DB registrations for this event
      const dbCountRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM public.registrations WHERE event_id = $1`,
        [session.eventId]
      );
      const totalDbRegistrations = dbCountRes.rows[0]?.count || 0;

      const existingRes = await client.query(
        `SELECT lower(email) AS email, phone_number FROM public.registrations WHERE event_id = $1`,
        [session.eventId]
      );

      const dbEmails = new Set<string>();
      const dbPhoneDigits = new Set<string>();
      const dbRawPhones = new Set<string>();

      for (const r of existingRes.rows) {
        if (r.email) dbEmails.add(r.email.trim().toLowerCase());
        if (r.phone_number) {
          dbRawPhones.add(r.phone_number.trim());
          const digits = getDigitsOnlyPhone(r.phone_number);
          if (digits) dbPhoneDigits.add(digits);
        }
      }

      // 5. Compare EVERY parsed row in the sheet against DB
      const missingRows: Array<{
        sheetLine: number;
        full_name: string;
        phone_number: string;
        email: string;
        gender: string;
        age: number;
      }> = [];

      let matchedCount = 0;

      for (let idx = 0; idx < validRows.length; idx++) {
        const row = validRows[idx];
        const sheetLine = idx + 2; // +1 header, +1 1-based index

        const cleanEmail = (row.email || '').trim().toLowerCase();
        const cleanPhone = normalizePhoneNumber(row.phone_number);
        const phoneDigits = getDigitsOnlyPhone(row.phone_number);

        let isMatched = false;

        if (cleanEmail && dbEmails.has(cleanEmail)) {
          isMatched = true;
        } else if (
          (cleanPhone && dbRawPhones.has(cleanPhone)) ||
          (phoneDigits && dbPhoneDigits.has(phoneDigits))
        ) {
          isMatched = true;
        }

        if (isMatched) {
          matchedCount++;
        } else {
          missingRows.push({
            sheetLine,
            full_name: row.full_name,
            phone_number: row.phone_number,
            email: row.email,
            gender: row.gender,
            age: row.age,
          });
        }
      }

      const missingCount = missingRows.length;
      const isFullyReconciled = missingCount === 0;

      console.log(`\n================================================================`);
      console.log(`[VERIFY SYNC RECONCILIATION] Event: "${eventInfo.name}" (${session.eventId})`);
      console.log(`[VERIFY SYNC RECONCILIATION] Total Sheet Data Rows: ${totalDataRowsCount}`);
      console.log(`[VERIFY SYNC RECONCILIATION] Total App DB Registrations: ${totalDbRegistrations}`);
      console.log(`[VERIFY SYNC RECONCILIATION] Matched Rows: ${matchedCount}`);
      console.log(`[VERIFY SYNC RECONCILIATION] Missing Rows Count: ${missingCount}`);
      console.log(`[VERIFY SYNC RECONCILIATION] Fully Reconciled: ${isFullyReconciled}`);
      console.log(`================================================================\n`);

      return NextResponse.json({
        success: true,
        totalSheetRows: totalDataRowsCount,
        totalDbRegistrations,
        matchedCount,
        missingCount,
        missingRows,
        isFullyReconciled,
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/google-sheet/verify POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to perform sync verification.' },
      { status: 500 }
    );
  }
}
