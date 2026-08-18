# Prompt for Antigravity: Adult/Child Toggle + Primary Teeth Chart in Register Patient

## Goal
In the "Register Patient" flow, add a Patient Type selector — **Adult** / **Child** — and make the
tooth chart shown during registration switch between the permanent (adult) chart and the primary
(deciduous/baby teeth) chart based on that selection.

## Step 0 — Before writing code
Search the codebase for the existing tooth chart / odontogram component used in registration
(likely named something like `ToothChart`, `Odontogram`, `DentalChart`). Reuse its rendering logic
and visual style — don't build a parallel chart from scratch. Match existing code conventions,
state management pattern, and styling.

## Requirements

### 1. Patient Type control
- Add a segmented control / radio group labeled **"Patient Type"** with options **Adult** and **Child**,
  placed near the existing tooth chart section in the registration form.
- Default to **Adult** unless the form already has a `dateOfBirth`/age field — if so, pre-select
  **Child** when age < 12 (or your clinic's cutoff) but still let the user override manually.
- Store the selection on the patient record, e.g. `patientType: 'adult' | 'child'`, and persist it to
  the DB along with the rest of the registration data.

### 2. Chart swap behavior
- Switching the toggle immediately re-renders the chart (no page reload) — swap the **data set**, not
  the whole component, so existing chart styling/interactions stay consistent.
- If the tooth-selection component holds an internal `toothSet` prop/config, extend it to accept
  `'permanent' | 'primary'` and pass the right one based on `patientType`.
- If any teeth are already selected/marked when the user switches type, either clear them or show a
  confirmation ("Switching to Child will reset your tooth selections — continue?") — pick whichever
  matches how the app handles similar destructive state changes elsewhere.

### 3. Primary (Child) teeth data — FDI two-digit system
20 teeth total, grouped by quadrant exactly like the reference chart:

| Quadrant | Label | Tooth codes (mesial→distal from midline) |
|---|---|---|
| 5 | Upper right | 55, 54, 53, 52, 51 |
| 6 | Upper left | 61, 62, 63, 64, 65 |
| 8 | Lower right | 85, 84, 83, 82, 81 |
| 7 | Lower left | 71, 72, 73, 74, 75 |

Layout mirrors the uploaded reference: upper arch on top (right quadrant on the left side of screen,
left quadrant on the right — standard dental "patient-facing" orientation), lower arch on the bottom,
same split. Reuse the existing adult chart's tooth icon shapes if it already visually distinguishes
incisors/canines/molars.

### 4. Permanent (Adult) teeth data — for reference/parity
32 teeth, existing behavior should already cover this, but confirm it matches:

| Quadrant | Label | Tooth codes |
|---|---|---|
| 1 | Upper right | 18–11 |
| 2 | Upper left | 21–28 |
| 3 | Lower left | 31–38 |
| 4 | Lower right | 41–48 |

### 5. Accessibility & UX
- Toggle must be keyboard-navigable and properly labeled for screen readers.
- Chart region should announce/update (e.g. `aria-live` or equivalent) when the tooth set changes,
  so assistive tech users know the chart switched.

### 6. Propagation to Doctor's "Start Consultation" screen
- On the **Patient Registration Details & Consultation Entry** screen (doctor's consultation view),
  show the `patientType` that the receptionist selected during registration — don't leave the doctor
  to re-enter it.
- Make it editable here too: if the doctor changes it (e.g. receptionist mis-set it, or a "child"
  patient has since become an adult), update the same `patientType` field on the patient record so
  every screen (registration, consultation, appointment table) stays in sync — single source of truth,
  not a separate copy per screen.
- The tooth chart on this screen must follow `patientType` exactly like on registration: Adult →
  32-tooth permanent chart, Child → 20-tooth primary chart (Section 3/4 above). Reuse the same chart
  component/config from the registration change, don't reimplement it here.
- **Design decision to confirm:** should `patientType` be a single current-state flag on the Patient
  record (simplest, used here), or snapshotted per appointment so a patient's chart type at each past
  visit is preserved even after they "graduate" from child to adult? Default to the single-flag
  approach unless historical accuracy per visit matters for your clinic's records.

### 7. Appointment table / consultation list
- Add a **Patient Type** column (or badge, e.g. "Adult" / "Child" pill) to the appointment table and/or
  consultation list view, sourced from the patient's `patientType`.
- If appointments are joined from the Patient table already, this should just be an added column in
  the existing query — no new table/relation needed unless you decide to snapshot per appointment
  (see above).

## Acceptance criteria
- [ ] Adult/Child toggle appears in Register Patient, defaults sensibly, is fully functional.
- [ ] Selecting Child renders the 20-tooth primary chart with the exact FDI codes above, in the
      correct quadrant layout.
- [ ] Selecting Adult renders the existing 32-tooth permanent chart, unchanged from current behavior.
- [ ] `patientType` is saved with the patient record and correctly re-loads the right chart when
      viewing/editing an existing patient.
- [ ] No regressions to existing tooth-selection/marking functionality on the adult chart.
- [ ] Basic test coverage: toggling switches chart data, saved patientType persists and reloads
      correctly.
- [ ] Doctor's Patient Registration Details & Consultation Entry screen shows the patient type set at
      registration and lets it be edited, updating the same underlying field.
- [ ] Tooth chart on the consultation screen matches `patientType`, using the same chart component as
      registration.
- [ ] Appointment table / consultation list displays patient type (Adult/Child) per patient.
- [ ] Changing patient type from any one screen (registration or consultation) is reflected everywhere
      else that reads it, with no stale/out-of-sync copies.
