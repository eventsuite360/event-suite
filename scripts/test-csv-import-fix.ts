import { parseCSVRegistrations } from '../src/lib/registration-export';

function testCSVImportFix() {
  console.log('--- TESTING CSV IMPORT HEADER & MULTI-COLUMN MATCHING FIX ---');

  // Generate test CSV simulating the user's issue:
  // 58 rows where column "Email" is empty (""), but column "Email Address" contains valid emails.
  // Also contains extra columns: "Timestamp", "Column 7", "Email Sent"
  let csvContent = 'Timestamp,Full Name,Phone Number,Gender,Age,Email,Email Address,Email Sent,Column 7\n';

  for (let i = 1; i <= 58; i++) {
    csvContent += `2026-08-29 10:00:00,"Attendee ${i}","+1 555-010-${100 + i}",${
      i % 2 === 0 ? 'Male' : 'Female'
    },${20 + (i % 30)},"","attendee${i}@eventsuite360.com","Yes","Unused Column Data"\n`;
  }

  const { validRows, errors } = parseCSVRegistrations(csvContent);

  console.log(`Input rows count: 58`);
  console.log(`Parsed valid rows count: ${validRows.length}`);
  console.log(`Errors count: ${errors.length}`);

  if (errors.length > 0) {
    console.error('❌ Errors encountered during CSV parse:', errors.slice(0, 5));
  }

  if (validRows.length !== 58) {
    console.error(`❌ Expected 58 valid rows, got ${validRows.length}`);
    process.exit(1);
  }

  // Check email extracted from row 1 and row 58
  console.log(`Row 1 extracted email: "${validRows[0].email}"`);
  console.log(`Row 58 extracted email: "${validRows[57].email}"`);

  if (validRows[0].email !== 'attendee1@eventsuite360.com') {
    console.error('❌ Failed to pull email from "Email Address" column!');
    process.exit(1);
  }

  if (validRows[57].email !== 'attendee58@eventsuite360.com') {
    console.error('❌ Failed to pull email from "Email Address" column for row 58!');
    process.exit(1);
  }

  console.log('\n✨ ALL 58 ROWS SUCCESSFULLY IMPORTED USING "Email Address" COLUMN!');
  console.log('✨ EXTRA UNMAPPED COLUMNS ("Timestamp", "Email Sent", "Column 7") SKIPPED CLEANLY!');
}

testCSVImportFix();
