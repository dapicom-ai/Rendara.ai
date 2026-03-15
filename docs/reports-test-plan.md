# Reports Feature Test Plan

## Overview

This document defines the test plan for the Rendara Reports feature, covering the reports index page (`/reports`), report builder page (`/reports/[id]`), and the public report consumer page (`/r/[uuid]`).

**Backend**: `http://localhost:8001`
**Frontend**: `http://localhost:3000`

---

## Test Cases

### TC-RPT-001 | P0 | Create new report via "New Report" button
**Area**: Reports Index -> Builder Navigation
**Steps**:
1. Navigate to `/reports`
2. Click "New Report" button
3. Wait for navigation

**Expected**:
- POST `/api/reports` is called with `{ title: "Untitled Report" }`
- Browser navigates to `/reports/[new-id]`
- Builder page loads with title "Untitled Report"

---

### TC-RPT-002 | P0 | Builder renders with title and action buttons
**Area**: Report Builder
**Steps**:
1. Create a report via API
2. Navigate to `/reports/[id]`
3. Verify page elements

**Expected**:
- Report title is displayed as an h1
- "Add Heading" button is visible
- "Add Text" button is visible
- Back button (chevron left) is visible
- Publish button area is visible

---

### TC-RPT-003 | P0 | Add heading section
**Area**: Report Builder - Sections
**Steps**:
1. Navigate to report builder for an existing report
2. Click "Add Heading" button
3. Wait for section to appear

**Expected**:
- New section block appears with text "New heading"
- Section is rendered as an h2 element
- Section has delete button
- PUT `/api/reports/[id]` is called with updated content

---

### TC-RPT-004 | P0 | Add text section
**Area**: Report Builder - Sections
**Steps**:
1. Navigate to report builder for an existing report
2. Click "Add Text" button
3. Wait for section to appear

**Expected**:
- New section block appears with text "New section"
- Section is rendered as a p element
- Section has delete button

---

### TC-RPT-005 | P0 | Edit heading section inline
**Area**: Report Builder - Inline Edit
**Steps**:
1. Navigate to report builder with a heading section
2. Click on heading text
3. Type new text in the input field
4. Blur the input (click elsewhere)

**Expected**:
- Clicking heading switches to input field (autoFocus)
- Typing changes the input value
- On blur, section content is updated
- PUT is called with updated section content

---

### TC-RPT-006 | P0 | Edit text section inline
**Area**: Report Builder - Inline Edit
**Steps**:
1. Navigate to report builder with a text section
2. Click on text content
3. Type new content in the textarea
4. Blur the textarea

**Expected**:
- Clicking text switches to textarea (autoFocus)
- Typing changes the textarea value
- On blur, section content is updated

---

### TC-RPT-007 | P0 | Delete a section
**Area**: Report Builder - Sections
**Steps**:
1. Navigate to report builder with at least one section
2. Click the "Delete section" button on a section
3. Verify section disappears

**Expected**:
- Section is removed from the DOM
- PUT is called with sections array minus the deleted section

---

### TC-RPT-008 | P0 | Move section up/down
**Area**: Report Builder - Reorder
**Steps**:
1. Navigate to report builder with at least two sections
2. Click "Move down" on the first section
3. Verify order change
4. Click "Move up" on the second section (now first)
5. Verify order restored

**Expected**:
- After move down: sections swap positions
- After move up: sections swap back
- PUT is called after each reorder

---

### TC-RPT-009 | P0 | Publish report
**Area**: Report Builder - Publish
**Steps**:
1. Navigate to builder for an unpublished report
2. Click "Publish" button
3. Wait for publish dialog

**Expected**:
- POST `/api/reports/[id]/publish` is called
- Dialog appears with title "Report Published"
- Public URL is shown in the dialog
- Publish button text changes to "Published"

---

### TC-RPT-010 | P0 | Consumer page renders at /r/[uuid]
**Area**: Public Report Consumer
**Steps**:
1. Publish a report via API
2. Navigate to `/r/[uuid]`
3. Verify page elements

**Expected**:
- Report title is displayed as h1
- Sections render (headings as h2, text as p)
- No sidebar is present
- No edit controls (no Add Heading/Text buttons, no Delete buttons)
- "Powered by Rendara" footer is visible

---

### TC-RPT-011 | P1 | Reports index lists existing reports
**Area**: Reports Index
**Steps**:
1. Create multiple reports via API (some published, some draft)
2. Navigate to `/reports`
3. Wait for cards to load

**Expected**:
- Report cards are displayed in a grid
- Each card shows the report title
- Published reports show "Published" badge
- Draft reports show "Draft" badge

---

### TC-RPT-012 | P1 | Empty reports index shows empty state
**Area**: Reports Index - Empty State
**Steps**:
1. Ensure no reports exist (or use API intercept)
2. Navigate to `/reports`

**Expected**:
- EmptyState component renders with "No reports yet" title
- "Build your first data story" subtitle is visible
- "Create Report" CTA button is visible

---

### TC-RPT-013 | P1 | Report title inline edit
**Area**: Report Builder - Title Edit
**Steps**:
1. Navigate to report builder
2. Click on the h1 title text
3. Clear and type a new title
4. Press Enter or blur

**Expected**:
- Title switches to an input field
- Typing changes the value
- On blur/enter, PUT is called with the new title
- Title displays the updated text

---

### TC-RPT-014 | P1 | Consumer page shows scroll progress bar
**Area**: Public Report Consumer
**Steps**:
1. Navigate to `/r/[uuid]` for a published report
2. Scroll down the page
3. Verify progress bar width increases

**Expected**:
- A fixed, top-0, h-1, bg-accent progress bar element exists
- Scroll progress bar width starts at 0%
- After scrolling, width increases proportionally

---

### TC-RPT-015 | P1 | Published badge on report card
**Area**: Reports Index - Cards
**Steps**:
1. Create and publish a report via API
2. Navigate to `/reports`
3. Find the card for the published report

**Expected**:
- Card shows "Published" badge (cyan accent background)
- Date is formatted (e.g., "Mar 13"), not raw ISO string

---

### TC-RPT-016 | P1 | Back button in builder navigates back
**Area**: Report Builder - Navigation
**Steps**:
1. Navigate to `/reports`
2. Click on a report card to go to `/reports/[id]`
3. Click the back button (chevron left, aria-label="Go back")

**Expected**:
- Browser navigates back (URL changes away from `/reports/[id]`)

---

### TC-RPT-017 | P2 | Delete section from single-section report
**Area**: Report Builder - Edge Case
**Steps**:
1. Create report with one section via API
2. Navigate to builder
3. Delete the only section

**Expected**:
- Section disappears
- Sections area is empty (only Add Heading/Add Text buttons remain)
- No crash or error

---

### TC-RPT-018 | P2 | Move buttons visibility (first/last section)
**Area**: Report Builder - Reorder Edge Cases
**Steps**:
1. Create report with 3 sections via API
2. Navigate to builder
3. Check first section: should NOT have "Move up" button
4. Check first section: should have "Move down" button
5. Check last section: should have "Move up" button
6. Check last section: should NOT have "Move down" button

**Expected**:
- First section: no Move up, has Move down
- Last section: has Move up, no Move down
- Middle section: has both Move up and Move down

---

### TC-RPT-019 | P2 | Very long section content displays correctly
**Area**: Report Builder / Consumer - Content
**Steps**:
1. Create report with a text section containing 2000+ characters via API
2. Navigate to builder — verify content is visible and not truncated
3. Publish and navigate to consumer — verify content displays fully

**Expected**:
- Long content renders without overflow issues
- Content is fully visible (scrollable within the page)

---

### TC-RPT-020 | P2 | Consumer has "Powered by Rendara" footer
**Area**: Public Report Consumer - Footer
**Steps**:
1. Navigate to `/r/[uuid]`
2. Scroll to the bottom of the page

**Expected**:
- Footer element with "Powered by Rendara" text is visible
- Footer has border-t styling

---

## Test Data Requirements

- **Seed reports via API** before each test file runs
- Each test creates its own data via `POST /api/reports` for isolation
- Report content uses the `content` field (array of `{id, type, content}` objects)
- Publish via `POST /api/reports/[id]/publish` returns `{public_uuid, public_url}`

## Known Issues / Data Shape Notes

- Backend `GET /api/reports` returns `section_count`, `public_uuid`, `updated_at` (snake_case)
- Frontend `ReportsPage` expects `sectionCount`, `isPublished`, `updatedAt` (camelCase)
- Builder page maps `data.content` to `report.sections` in its `useEffect`
- Consumer page maps `data.content` to `report.sections` in its `useEffect`
- The `content` array items use `{id, type, content, title?}` shape
