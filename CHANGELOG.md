# Changelog

All notable changes to this project will be documented in this file.

## [3.2.3] - 2026-07-19

### Fixed
- **Auth Storage**: Changed login credentials storage from `localStorage` to `sessionStorage` to ensure user sessions automatically clear when the application is closed.
- **Profile Letter Display**: Fixed an issue in `TopBar` where the profile initial and user details (username and role) were not showing correctly due to nested login response structure.

## [3.2.0] - 2026-07-16

### Added
- **API Pre-Warming & Health Check**: Added `/api/health` endpoint for backend instance pre-warming.
- **HTTP QUERY Method**: Implemented the HTTP `QUERY` method for sites retrieval to optimize dashboard queries and decrease payload overhead.

### Fixed
- **Cloudflare Integration**: Added POST fallback for sites listing queries to resolve Cloudflare 405 error blocks.
- **JWT Verification Compatibility**: Made JWT verification backward-compatible so that older live Windows desktop clients continue to function without breaking.

## [3.1.0] - 2026-07-16

### Added
- **Dark Theme Polish**: Completed comprehensive UI polish and styling updates for the dark theme across various administrative dashboards.
- **Backend Security Upgrade**: Added JWT authentication, rate limiting, and Helmet security middleware to accommodate the new mobile application.

### Fixed
- **Hourly Basis Payroll Calculation**: Corrected an issue where hourly rate calculation incorrectly converted daily basis for hourly workers under Shift mode (now properly scaled as 8x).
- **UI Grid Clipping**: Fixed layout issue where PersonType cards and edit panels were clipped due to `overflow: hidden` restrictions.

## [3.0.0] - 2026-07-08

### Added
- **Local SQLite Native Build**: Re-configured electron packaging with native rebuild support (`npx @electron/rebuild`) for local `sqlite3` database dependencies.
- **Hourly Basis Salary Calculation**: Implemented manual Hourly salary mode settings in Attendance Entry panels.

### Improved
- **Sync & Query Optimization**: Enhanced Sequelize database queries and offline local syncing loop throughput.

## [2.7.0] - 2026-06-28

### Fixed
- **Sync Collision Resolver**: Resolved duplicate primary key clashing and sync queue database errors.
- **Payload Validation**: Added safety checks in sync delete routing to avoid crashes on null payloads.

## [2.6.0] - 2026-06-28

### Added
- **Menu Bar**: Implemented native Windows frame menu bar.
- **Auto-Update Checks**: Added logic to verify client updates automatically.
- **Manual Sheet Config**: Provided tools to manually adjust Pay Sheet configurations.

### Improved
- **Concurrency & Concurrency Locking**: Enabled WAL mode and added custom database timeouts in SQLite connection settings to prevent database deadlock states.

## [2.5.0] - 2026-06-26

### Added
- **SQLite Local Database**: Migrated the desktop client from local JSON structures to a fast, robust SQLite local instance.
- **Sync Status UI**: Integrated an offline synchronization state dashboard showing real-time network states and synchronizing queues.
- **Cloud Ingestion Sync**: Added pull/push synchronizing pipelines linking local records with Render API production databases.
- **Rebranding**: Renamed software to "Jeeva Cloud ERP".

## [2.4.0] - 2026-06-17

### Added
- **Dealer & Supplier Payments**: Dealers are now integrated as payees on the Weekly Pay Sheet, featuring automatic calculation of purchased materials and specific collapsible Purchase Details inside the payment popup.
- **Sq-Ft Calculation Mode**: Added a new mode for material purchases (like Tiles or Granite) which auto-calculates total square feet based on length, breadth, and an optional wastage percentage.
- **Floor Sections & Projects**: Enabled creating sub-projects and floor sections (e.g., Ground Floor) under a main Site, and tagging specific material purchases to them.
- **Undo System**: Implemented a Ctrl+Z based undo feature for the Weekly Pay Sheet to easily revert mistakes.
- **Database Schema v4**: Added `SiteSections`, `SiteProjects`, `ActionLogs` tables, and updated `SiteMaterials` to track advanced calculations. A complete snapshot of the database was exported to `v4_civil-erp_script.sql`.

### Fixed
- Fixed an issue in `SiteDetailPage` causing a blank screen due to `require` usage inside the Vite ES module environment.

### Improved
- **Payment Modals**: Redesigned the payment interaction modals with dynamic discounts computation natively linked to Material ledgers.
- **Toast Notifications**: Integrated global toast alerts for successful user operations.
