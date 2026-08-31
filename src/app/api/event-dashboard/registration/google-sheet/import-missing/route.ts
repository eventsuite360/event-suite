import { NextRequest, NextResponse } from 'next/server';
import { getRequestSessionData } from '@/lib/session';
import { getPgClient } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/registration-export';

// POST /api/event-dashboard/registration/google-sheet/import-missing - Insert ONLY specific identified missing rows
export async function POST(req: NextRequest) {
  try {
    const session = await getRequestSessionData(req);

    if (!session || !session.eventId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role === 'event_sub_user') {
      return NextResponse.json(
        { error: 'Forbidden — Only Event Admins can import missing registrations.' },
        { status: 403 }
      );
    }

    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No missing rows provided for import.' }, { status: 400 });
    }

    const client = getPgClient();
    await client.connect();

    try {
      let creatorName = 'Google Sheet Sync (Import Missing)';
      if (session.role === 'event_admin') {
        creatorName = 'Event Admin (Import Missing)';
      }

      await client.query('BEGIN');
      let insertedCount = 0;

      for (const row of rows) {
        const rawName = (row.full_name || '').trim();
        const rawPhone = (row.phone_number || '').trim();
        const cleanPhone = normalizePhoneNumber(rawPhone);
        const rawGender = (row.gender || '').trim();
        const rawEmail = (row.email || '').trim().toLowerCase();

        let parsedAge = parseInt(row.age, 10);
        if (isNaN(parsedAge) || parsedAge < 0) {
          parsedAge = 0;
        }

        await client.query(
          `INSERT INTO public.registrations (
             event_id, full_name, phone_number, gender, age, email, created_by_user_id, created_by_user_name
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            session.eventId,
            rawName,
            cleanPhone || rawPhone,
            rawGender,
            parsedAge,
            rawEmail,
            session.email,
            creatorName,
          ]
        );
        insertedCount++;
      }

      // Update google_sheet_last_synced_at
      await client.query(
        `UPDATE public.events
         SET google_sheet_last_synced_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [session.eventId]
      );

      await client.query('COMMIT');

      console.log(`[IMPORT MISSING LOG] Event ID: ${session.eventId} | Imported ${insertedCount} missing rows.`);

      return NextResponse.json({
        success: true,
        count: insertedCount,
        message: `Successfully imported ${insertedCount} missing registration${insertedCount === 1 ? '' : 's'}.`,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[API /api/event-dashboard/registration/google-sheet/import-missing POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to import missing registrations.' },
      { status: 500 }
    );
  }
}
