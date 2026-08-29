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

  console.log(`✅ ${fileDescription} passed all mobile responsiveness checks.`);
  return true;
}

function verifyMobileResponsiveness() {
  console.log('--- STARTING MOBILE RESPONSIVENESS CHECKS ---');

  let passed = true;

  // 1. Check Admin Sidebar & Topbar Drawer Toggle
  passed = checkFileContains(
    'src/components/admin/Sidebar.tsx',
    ['md:hidden', 'onCloseMobile', 'fixed inset-0 z-50'],
    'Admin Sidebar Mobile Drawer'
  ) && passed;

  passed = checkFileContains(
    'src/components/admin/Topbar.tsx',
    ['onMenuClick', 'md:hidden', 'Menu'],
    'Admin Topbar Hamburger Button'
  ) && passed;

  // 2. Check Event Dashboard Sidebar & Topbar Drawer Toggle
  passed = checkFileContains(
    'src/components/event-dashboard/EventSidebar.tsx',
    ['md:hidden', 'onCloseMobile', 'fixed inset-0 z-50'],
    'Event Sidebar Mobile Drawer'
  ) && passed;

  passed = checkFileContains(
    'src/components/event-dashboard/EventTopbar.tsx',
    ['onMenuClick', 'md:hidden', 'Menu'],
    'Event Topbar Hamburger Button'
  ) && passed;

  // 3. Check Modal Dialog Responsive Constraints
  passed = checkFileContains(
    'src/components/ui/Modal.tsx',
    ['max-h-[90vh]', 'p-3 sm:p-4', 'max-w-lg mx-auto'],
    'Modal Dialog Mobile Constraints'
  ) && passed;

  // 4. Check Registration Page Mobile Responsiveness
  passed = checkFileContains(
    'src/app/event-dashboard/registration/page.tsx',
    ['flex-wrap', 'overflow-x-auto'],
    'Registration Page Action Wrap & Table Scroll'
  ) && passed;

  // 5. Check Login Page Mobile Responsiveness
  passed = checkFileContains(
    'src/app/login/page.tsx',
    ['py-8 px-4 sm:py-12', 'sm:max-w-md'],
    'Login Page Mobile Scaling'
  ) && passed;

  if (passed) {
    console.log('\n✨ ALL MOBILE RESPONSIVENESS CHECKS PASSED PERFECTLY!');
  } else {
    console.error('\n❌ SOME MOBILE RESPONSIVENESS CHECKS FAILED!');
    process.exit(1);
  }
}

verifyMobileResponsiveness();
