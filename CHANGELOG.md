# Changelog

All notable changes to this project will be documented in this file.

## [3.2.3] - 2026-07-19

### Fixed
- **Auth Storage**: Changed login credentials storage from `localStorage` to `sessionStorage` to ensure user sessions automatically clear when the application is closed.
- **Profile Letter Display**: Fixed an issue in `TopBar` where the profile initial and user details (username and role) were not showing correctly due to nested login response structure.

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
