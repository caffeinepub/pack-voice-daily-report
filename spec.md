# AK Pack – Voice Daily Report

## Current State
A React frontend app with a basic structure exists. The app previously had a landing page, voice report submission, and admin dashboard. We are rebuilding it completely to match the new spec.

## Requested Changes (Diff)

### Add
- Full-screen voice-first gym payment logger UI
- Large circular mic button using Web Speech API (lang: en-IN)
- Voice parsing logic: Word1=Name, first number=MemberID, cash/upi/both keywords=type, amounts after keyword, rest=note
- Manual input form: Name, Member ID, Type toggle (CASH/UPI/BOTH), conditional amount fields, Note
- Live total display when BOTH is selected
- Status bar: Ready / Listening (pulse) / Processing / Saved / Error
- Today's Entries list with color-coded cards (green=cash, purple=upi, amber=both)
- localStorage persistence keyed by date
- Configurable Google Apps Script webhook URL (collapsible settings at bottom)
- POST to webhook on save
- Auto-clear fields after save

### Modify
- Complete redesign: dark theme (#080808 bg), Syne + JetBrains Mono fonts
- Colors: #00ff88 cash, #a78bfa upi, #fbbf24 both
- Mobile-first, max-width 480px, centered
- Header: "AK Pack" with accent "Pack", date pill top-right

### Remove
- All previous pages (landing, admin dashboard, member report)
- Any multi-page routing

## Implementation Plan
1. Replace App.tsx with single-page voice logger
2. Update index.css with dark theme, Google Fonts imports (Syne, JetBrains Mono)
3. Implement voice input with Web Speech API hook
4. Implement voice parsing logic
5. Build manual form with type toggle and conditional fields
6. Build entries list with color-coded cards
7. Add collapsible settings for webhook URL
8. Wire localStorage save/load keyed by today's date
9. Wire POST to webhook on entry save
