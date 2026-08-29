import fs from 'fs';
import path from 'path';

function checkFileContains(filePath: string, searchPatterns: string[], fileDescription: string) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const missing: string[] = [];

  for (const pattern of searchPatterns) {
    if (!content.includes(pattern)) {
      missing.push(pattern);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ ${fileDescription} (${filePath}) missing patterns:`, missing);
    return false;
  }

  console.log(`✅ ${fileDescription} passed all interactive monochrome pie chart checks.`);
  return true;
}

function verifyPieCharts() {
  console.log('--- STARTING INTERACTIVE PIE CHART VERIFICATION ---');

  let passed = true;

  // 1. Check PieChart UI component
  passed = checkFileContains(
    'src/components/ui/PieChart.tsx',
    ['hoveredIndex', 'getArcPath', 'stroke="#ffffff"', 'onMouseEnter', 'onMouseLeave', 'slices.map'],
    'PieChart UI Component'
  ) && passed;

  // 2. Check Registration Page
  passed = checkFileContains(
    'src/app/event-dashboard/registration/page.tsx',
    ['<PieChart', 'data={[', 'analytics.gender.Male', "analytics.age['0-18']"],
    'Registration Page Pie Charts'
  ) && passed;

  // 3. Check Admin Event Detail Page
  passed = checkFileContains(
    'src/app/admin/events/[eventId]/page.tsx',
    ['<PieChart', 'registrationAnalytics.gender.Male', "registrationAnalytics.age['0-18']"],
    'Admin Event Detail Page Pie Charts'
  ) && passed;

  // 4. Check Finance Page
  passed = checkFileContains(
    'src/app/event-dashboard/finance/page.tsx',
    ['<PieChart', 'Revenue vs. Expense Ratio'],
    'Finance Page Revenue vs Expense Pie Chart'
  ) && passed;

  if (passed) {
    console.log('\n✨ ALL INTERACTIVE MONOCHROME PIE CHART CHECKS PASSED PERFECTLY!');
  } else {
    console.error('\n❌ SOME PIE CHART CHECKS FAILED!');
    process.exit(1);
  }
}

verifyPieCharts();
