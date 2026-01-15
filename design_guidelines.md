# Enterprise Asset Management System - Design Guidelines

## Design Approach
**Selected System:** Material Design 3 with enterprise customization
**Rationale:** Material Design provides robust components for data-dense applications, clear visual hierarchy, and proven patterns for complex workflows like spreadsheet imports and audit trails.

## Typography System
- **Primary Font:** Inter (via Google Fonts CDN)
- **Headers:** 
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Card titles: text-base font-medium
- **Body Text:** text-sm for data tables, text-base for forms
- **Data/Numbers:** font-mono for asset IDs, serial numbers, timestamps

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, py-8)
- Sidebar width: w-64
- Main content: max-w-7xl with px-6 py-8
- Card padding: p-6
- Form spacing: space-y-6
- Table cell padding: px-4 py-3

## Core Layout Structure

### Navigation Architecture
**Left Sidebar (Fixed):**
- Logo/branding area (h-16)
- Primary navigation items with icons
- Sections: Dashboard, Assets, Categories, Users, Audit Logs, Import Data, Settings
- User profile at bottom with Active Directory status indicator

**Top Bar:**
- Breadcrumb navigation
- Global search with autocomplete
- Quick actions dropdown (Add Asset, Import Spreadsheet)
- Notifications bell
- User avatar with AD sync status

### Dashboard Components

**Asset Overview Cards (Grid: lg:grid-cols-4 md:grid-cols-2):**
- Total Assets count with trend indicator
- Assets by Category breakdown
- Recent Changes (last 7 days)
- Pending Audits count

**Data Table (Primary Component):**
- Sticky header row
- Sortable columns with visual indicators
- Row selection checkboxes
- Quick action icons per row (Edit, Audit, Delete)
- Pagination with items-per-page selector
- Advanced filter panel (collapsible)
- Export options (CSV, Excel, PDF)

### Spreadsheet Import Workflow

**Multi-Step Process (Stepper Component):**
1. Upload File (drag-drop zone with file type restrictions)
2. Map Headers (side-by-side comparison: spreadsheet column → database field)
   - Auto-mapping suggestions with confidence scores
   - Manual override dropdowns
   - Preview of first 5 rows
3. Validation Results (error/warning summary with row numbers)
4. Confirmation & Import

**Header Mapping Interface:**
- Two-column layout
- Left: Spreadsheet columns (detected headers)
- Right: Database field dropdowns with search
- Visual connectors between mapped fields
- Conflict indicators for duplicates

### Asset Management

**Asset Detail View (Split Layout):**
- Left panel (w-2/3): Tabbed interface
  - Details tab: Form fields with edit mode
  - Audit History: Timeline component
  - Related Assets: Card grid
  - Documents: File attachment list
- Right panel (w-1/3): 
  - Asset image/placeholder
  - Quick stats
  - Assigned user (AD linked) with avatar
  - Category badge
  - Status indicator

**Category Management:**
- Hierarchical tree view with expand/collapse
- Drag-to-reorder functionality
- Inline add/edit forms
- Asset count per category

### Audit Capabilities

**Audit Log Table:**
- Timestamp (sortable, filterable by date range)
- User (with AD info)
- Action type (badge with icon)
- Asset affected (linked)
- Changes made (expandable details)
- IP address and location

**Audit Trail Detail:**
- Before/After comparison view for field changes
- JSON diff view option for technical users
- Export audit report button

### Active Directory Integration

**User Management Interface:**
- Sync status banner (last sync time, next scheduled)
- Manual sync trigger button
- User table with AD fields: Name, Email, Department, Manager
- Asset assignment quick-add
- Filter by AD groups

## Component Library

**Forms:**
- Floating labels on inputs
- Clear validation states (error, success, warning)
- Helper text below fields
- Required field indicators (asterisk)

**Cards:**
- Elevation shadow (shadow-md)
- Rounded corners (rounded-lg)
- Consistent padding (p-6)
- Header with actions dropdown

**Buttons:**
- Primary: filled, prominent
- Secondary: outlined
- Tertiary: text-only for less emphasis
- Icon buttons for table actions (p-2, rounded-full on hover)

**Data Visualization:**
- Simple bar charts for category distribution
- Line graphs for asset acquisition timeline
- Donut charts for status breakdowns
- Use Chart.js via CDN

**Icons:**
Use Material Icons via CDN for consistency with design system

**Modals:**
- Center-screen overlay
- max-w-2xl for forms
- Backdrop blur
- Slide-up animation entrance

## Accessibility
- Keyboard navigation throughout
- ARIA labels on all interactive elements
- Focus indicators (ring-2 ring-offset-2)
- Screen reader announcements for dynamic content

**No hero images** - this is a utility application focused on efficiency and data management.