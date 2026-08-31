export interface RegistrationItem {
  id: string;
  event_id: string;
  full_name: string;
  phone_number: string;
  gender: string;
  age: number;
  email: string;
  created_by_user_id: string;
  created_by_user_name: string;
  created_at: string;
}

export interface ParsedRegistrationRow {
  full_name: string;
  phone_number: string;
  gender: string;
  age: number;
  email: string;
}

export function extractGoogleSheetId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// 1. Export Registrations to CSV
export function exportRegistrationsToCSV(registrations: RegistrationItem[], filename = 'registrations.csv') {
  const headers = ['Full Name', 'Phone Number', 'Gender', 'Age', 'Email', 'Added By', 'Created At'];
  
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = registrations.map((r) => [
    escapeCsv(r.full_name),
    escapeCsv(r.phone_number),
    escapeCsv(r.gender),
    escapeCsv(r.age),
    escapeCsv(r.email),
    escapeCsv(r.created_by_user_name || r.created_by_user_id),
    escapeCsv(new Date(r.created_at).toLocaleString()),
  ]);

  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 2. Export Registrations to PDF via clean printable layout
export function exportRegistrationsToPDF(registrations: RegistrationItem[], eventName = 'Event Registration Summary') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRowsHtml = registrations
    .map(
      (r, idx) => `
      <tr style="border-bottom: 1px solid #e4e4e7;">
        <td style="padding: 10px 12px; font-size: 13px; color: #18181b;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #09090b;">${r.full_name}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #27272a;">${r.phone_number}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #27272a;">${r.gender}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #27272a;">${r.age}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #27272a;">${r.email}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #52525b;">${r.created_by_user_name || r.created_by_user_id}</td>
        <td style="padding: 10px 12px; font-size: 12px; color: #71717a;">${new Date(r.created_at).toLocaleDateString()}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Registration Report - ${eventName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #09090b; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #09090b; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
          .subtitle { font-size: 13px; color: #71717a; margin-top: 4px; }
          .badge { background: #09090b; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f4f4f5; padding: 10px 12px; font-size: 12px; font-weight: 700; color: #18181b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #d4d4d8; }
          .footer { margin-top: 30px; border-top: 1px solid #e4e4e7; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #a1a1aa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Event Suite 360</h1>
            <div class="subtitle">Registration Overview — ${eventName}</div>
          </div>
          <div>
            <span class="badge">Total Attendees: ${registrations.length}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Email</th>
              <th>Added By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Generated on ${new Date().toLocaleString()}</div>
          <div>Confidential — Event Suite 360 Registration Module</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// Helper to normalize phone numbers (strips spaces, dashes, brackets, non-digits except optional leading +)
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

export function getDigitsOnlyPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

// Helper to parse full CSV text into 2D records matrix respecting quoted line breaks
export function parseCSVRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' || char === "'") {
      if (inQuotes && nextChar === char) {
        currentField += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRecord.push(currentField.trim());
      if (currentRecord.some((f) => f.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some((f) => f.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

// 3. Parse CSV text into validated registration rows with robust multi-column header matching & multiline support
export function parseCSVRegistrations(csvText: string): {
  validRows: ParsedRegistrationRow[];
  errors: string[];
  totalDataRowsCount: number;
} {
  const records = parseCSVRecords(csvText);
  if (records.length === 0) {
    return { validRows: [], errors: ['CSV file is empty.'], totalDataRowsCount: 0 };
  }

  const headerCells = records[0];
  const normalizedHeaders = headerCells.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Excluded / ignored header patterns
  const ignoredPatterns = ['timestamp', 'column7', 'emailsent', 'column'];

  // Find ALL matching column indices for candidate aliases while filtering ignored headers
  const findAllHeaderIndices = (aliases: string[]): number[] => {
    const indices: number[] = [];
    normalizedHeaders.forEach((h, idx) => {
      if (ignoredPatterns.some((p) => h.startsWith(p) || h === p)) {
        return;
      }
      if (aliases.some((alias) => h === alias || h.includes(alias))) {
        indices.push(idx);
      }
    });
    return indices;
  };

  // Candidate alias lists for each field
  const nameIndices = findAllHeaderIndices(['fullname', 'full_name', 'name', 'attendee', 'participant']);
  const phoneIndices = findAllHeaderIndices(['phonenumber', 'phone_number', 'phone', 'mobile', 'contact', 'cell', 'whatsapp']);
  const genderIndices = findAllHeaderIndices(['gender', 'sex']);
  const ageIndices = findAllHeaderIndices(['age']);
  const emailIndices = findAllHeaderIndices(['emailaddress', 'email_address', 'email', 'e-mail', 'mail']).filter(
    (idx) => !normalizedHeaders[idx].includes('sent')
  );

  const errors: string[] = [];
  const missingHeaders: string[] = [];

  if (nameIndices.length === 0) missingHeaders.push('Full Name');
  if (phoneIndices.length === 0 && emailIndices.length === 0) missingHeaders.push('Email or Phone Number');

  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [`Missing required column headers: ${missingHeaders.join(', ')}. Please check your CSV header row.`],
      totalDataRowsCount: Math.max(0, records.length - 1),
    };
  }

  // Helper to extract first non-empty cell value from candidate column indices
  const getFirstNonEmptyCell = (cells: string[], indices: number[]): string => {
    for (const idx of indices) {
      if (cells[idx] !== undefined && cells[idx] !== null && cells[idx].trim().length > 0) {
        return cells[idx].trim();
      }
    }
    return '';
  };

  // Helper specifically for email: pick first candidate cell containing '@', otherwise first non-empty candidate cell
  const getBestEmailCell = (cells: string[], indices: number[]): string => {
    for (const idx of indices) {
      const val = cells[idx] ? cells[idx].trim() : '';
      if (val && val.includes('@')) {
        return val;
      }
    }
    return getFirstNonEmptyCell(cells, indices);
  };

  const validRows: ParsedRegistrationRow[] = [];
  const dataRecords = records.slice(1);

  for (let i = 0; i < dataRecords.length; i++) {
    const cells = dataRecords[i];
    const rowNum = i + 2; // +1 for 1-index header, +1 for 1-index row count in sheet

    const rawName = getFirstNonEmptyCell(cells, nameIndices);
    const rawPhone = getFirstNonEmptyCell(cells, phoneIndices);
    const rawGender = getFirstNonEmptyCell(cells, genderIndices);
    const rawAge = getFirstNonEmptyCell(cells, ageIndices);
    const rawEmail = getBestEmailCell(cells, emailIndices);

    const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase() : '';
    const cleanPhone = normalizePhoneNumber(rawPhone);

    if (!rawName) {
      errors.push(`Row ${rowNum}: Full Name is missing.`);
      continue;
    }

    if (!cleanEmail && !cleanPhone) {
      errors.push(`Row ${rowNum}: Either Email or Phone Number is required.`);
      continue;
    }

    let parsedAge = parseInt(rawAge, 10);
    if (isNaN(parsedAge) || parsedAge < 0) {
      parsedAge = 0;
    }

    let normalizedGender = 'Other';
    const lowerGender = rawGender.toLowerCase();
    if (lowerGender.startsWith('m')) normalizedGender = 'Male';
    else if (lowerGender.startsWith('f')) normalizedGender = 'Female';
    else if (rawGender.trim()) normalizedGender = rawGender.trim();

    validRows.push({
      full_name: rawName,
      phone_number: cleanPhone || rawPhone.trim(),
      gender: normalizedGender,
      age: parsedAge,
      email: cleanEmail,
    });
  }

  return { validRows, errors, totalDataRowsCount: dataRecords.length };
}
