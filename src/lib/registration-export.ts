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

// Helper to parse line respecting CSV quotes
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      if (inQuotes && text[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 3. Parse CSV text into validated registration rows with tolerant column header mapping
export function parseCSVRegistrations(csvText: string): {
  validRows: ParsedRegistrationRow[];
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { validRows: [], errors: ['CSV file is empty.'] };
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // Find column indices by header matching
  const findHeaderIndex = (aliases: string[]) => {
    return rawHeaders.findIndex((h) => aliases.some((alias) => h === alias || h.includes(alias)));
  };

  const nameIdx = findHeaderIndex(['fullname', 'name', 'full_name', 'attendee', 'name']);
  const phoneIdx = findHeaderIndex(['phonenumber', 'phone', 'mobile', 'contact', 'cell']);
  const genderIdx = findHeaderIndex(['gender', 'sex']);
  const ageIdx = findHeaderIndex(['age']);
  const emailIdx = findHeaderIndex(['email', 'mail', 'emailaddress']);

  const errors: string[] = [];
  const missingHeaders: string[] = [];

  if (nameIdx === -1) missingHeaders.push('Full Name');
  if (phoneIdx === -1) missingHeaders.push('Phone Number');
  if (genderIdx === -1) missingHeaders.push('Gender');
  if (ageIdx === -1) missingHeaders.push('Age');
  if (emailIdx === -1) missingHeaders.push('Email');

  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [`Missing required column headers: ${missingHeaders.join(', ')}. Please check your CSV header row.`],
    };
  }

  const validRows: ParsedRegistrationRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine) continue;

    const cells = parseCSVLine(rowLine);
    const rowNum = i + 1;

    const rawName = cells[nameIdx] || '';
    const rawPhone = cells[phoneIdx] || '';
    const rawGender = cells[genderIdx] || '';
    const rawAge = cells[ageIdx] || '';
    const rawEmail = cells[emailIdx] || '';

    if (!rawName) {
      errors.push(`Row ${rowNum}: Full Name is missing.`);
      continue;
    }
    if (!rawPhone) {
      errors.push(`Row ${rowNum}: Phone Number is missing.`);
      continue;
    }
    if (!rawEmail || !rawEmail.includes('@')) {
      errors.push(`Row ${rowNum}: Valid Email is required.`);
      continue;
    }

    let parsedAge = parseInt(rawAge, 10);
    if (isNaN(parsedAge) || parsedAge < 0) {
      errors.push(`Row ${rowNum}: Age must be a positive number (got "${rawAge}").`);
      continue;
    }

    let normalizedGender = 'Other';
    const lowerGender = rawGender.toLowerCase();
    if (lowerGender.startsWith('m')) normalizedGender = 'Male';
    else if (lowerGender.startsWith('f')) normalizedGender = 'Female';
    else if (rawGender.trim()) normalizedGender = rawGender.trim();

    validRows.push({
      full_name: rawName,
      phone_number: rawPhone,
      gender: normalizedGender,
      age: parsedAge,
      email: rawEmail,
    });
  }

  return { validRows, errors };
}
