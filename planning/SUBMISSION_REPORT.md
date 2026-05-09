# ImpairmentOS — Submission Report

---

## Section 1: The Industry, In My Words

Fire protection ITM (inspection, testing, and maintenance) operates as a three-audience compliance stack. The Authority Having Jurisdiction (AHJ) enforces minimum code compliance, the property insurance carrier prices and conditions coverage, and the building owner pays for both the contract and the exposure. One contractor serves all three simultaneously — and produces one report that has to satisfy all of them.

The business model is structurally misaligned. Inspection fees are commoditized; the real margin is in deficiency repairs. Every inspection report is implicitly both a compliance document and a sales lead. That tension shapes what gets written down, how, and what gets quietly left out.

Current software — BuildingReports, InspectPoint, SmartService — has solved the routine workflow well. A technician can complete a quarterly inspection, generate a report, and close out a work order from a phone. The reporting layer works. What these platforms haven't solved is the adversarial moment: when a fire suppression system goes offline and an auditor, a fire marshal, or a subrogation attorney is asking what happened, who was notified, what was tested, and who signed off. That moment is still handled with a notebook, a phone call that nobody documented, and a verbal fire watch that nobody confirmed.

The friction point is not report generation. It's producing records that survive scrutiny. That requires structured, timestamped, jurisdiction-aware documentation at the moment the impairment occurs — not reconstructed after the fact.

Multi-jurisdiction complexity makes this worse. NFPA 25 is adopted at the local level, and adoption year varies by municipality. A contractor servicing buildings in Hartwell (2017 edition, notify all impairments immediately), Wessex (2014 edition, 4-hour threshold), and Dunmoor (2020 edition, 30-minute deadline) faces three different compliance regimes at three different addresses in the same day. Without a system that knows the rules for each property, compliance defaults to whatever the technician remembers — or invents.

---

## Section 2: The Failure Point

The Beacon Fire & Safety incident at Cedar Heights Apartments exposes a systemic failure in how the ITM industry handles the impairment lifecycle. It is not a bad-actor story. It is a structural story.

On Day -116, a wet sprinkler system on the 9th floor was taken offline for a frozen pipe repair. The impairment ran for 5 hours and 50 minutes. A fire watch was assigned. The repair was completed. The system was restored. Everything that operationally needed to happen happened.

Nothing that documentarily needed to happen happened.

No AHJ notification was filed — despite Hartwell Fire Code §17-4.7 requiring notification for all impairments with no threshold. Mike DiSalvo operated on a personally invented 4-hour rule that does not exist in Hartwell's code. The main drain test required by NFPA 25 §13.2.5 following restoration of an impairment exceeding 4 hours was either not performed or performed informally and never documented. The fire watch assignment, hours, and sign-off exist only in Mike's truck notebook.

When the NOV arrived 116 days later demanding the impairment record, Beacon had a scanned notebook page with margin notes. No AHJ confirmation reference. No formal main drain test record. No documented chain of custody for the 5h 50m during which 200 residential units were unprotected.

The failure point is this: **the impairment lifecycle has no system of record**. The operational work — isolating the system, posting fire watch, making the repair, restoring pressure — was handled competently. But the documentation workflow was informal, rule-governed by personal convention rather than code, and produced no artifact that could survive regulatory or legal scrutiny.

This is not unique to Beacon or to Mike. It is what happens when impairment documentation depends on individual memory and paper logs. The Beacon incident is the forcing event that made the cost visible. For every contractor who hasn't had a forcing event yet, the same exposure exists.

The three specific documentation failures at Cedar Heights are:
1. **AHJ notification not recorded** — Mike's 4-hour threshold is not in Hartwell's fire code. The impairment exceeded 5 hours regardless.
2. **Main drain test not formally documented** — Mike's notebook says "pressure good." The AHJ's file has nothing. Whether the test happened is now in dispute.
3. **Fire watch hours not invoiced or verified** — Carlos Rivera's time has no formal record. The assignment is in the notebook; the sign-off doesn't exist.

Each of these, individually, is a compliance gap. Together, they constitute an undefendable record.

---

## Section 3: How ImpairmentOS Works

ImpairmentOS is a state-machine-driven impairment management workflow. It replaces the notebook with a mobile-first, jurisdiction-aware system that produces an audit-ready Impairment Packet as a byproduct of doing the work the contractor was already doing.

**The state machine is the product.** An impairment moves through a defined sequence of states: OPEN → FIRE_WATCH_ACTIVE → REPAIR_IN_PROGRESS → RESTORATION_TESTING → PENDING_CLOSURE → CLOSED. Each transition requires specific inputs. Required fields are enforced — not prompted. The system cannot advance to CLOSED if AHJ notification hasn't been recorded for a jurisdiction that requires it. It cannot close without supervisor sign-off. These are not warnings. They are blocked transitions.

**The jurisdiction rules engine knows the local code.** When a technician opens an impairment at Cedar Heights, the system knows: City of Hartwell, NFPA 25-2017, §17-4.7 requires immediate notification for all impairments. Contact: Marshal Elena Reyes, (508) 555-0147. The AHJ notification step surfaces this information and requires documentation of who was called, by whom, and any reference number. At Wessex Office Park, the same flow knows: 4-hour threshold, different AHJ contact, NFPA 25-2014. The rules adapt to the property; the technician doesn't have to remember them.

**The Impairment Packet is the deliverable.** When an impairment is closed, a structured record is generated containing: a timestamped timeline of every event from open to close, a compliance checklist with pass/fail status for each jurisdiction requirement, a full event log with performer names and timestamps, and property/jurisdiction/contractor identification. This is the document that answers every question a fire marshal, carrier, or subrogation attorney will ask. It is generated automatically at closure — not assembled after the fact from memory.

**What ImpairmentOS does not do.** It is not a full ITM inspection platform. It does not generate quarterly or annual inspection reports. It does not handle scheduling, billing, or deficiency lifecycle tracking. Those are expansion opportunities; they are not this product. ImpairmentOS is a single-purpose tool for a single high-stakes workflow: impairment documentation from open to close.

**The field tech workflow is designed to be faster than the notebook.** Property and system are selected from a list; jurisdiction rules appear automatically. AHJ contact information is pre-loaded. Fire watch assignment is a two-field entry. Duration is computed. The main drain test calculates differential PSI and flags pass/fail automatically. A technician who is currently writing in a notebook during a repair call can complete the same documentation in under two minutes of phone interactions, spread across the natural breaks in the repair workflow.

---

## Section 4: Two Honest Answers

### What comes close, and why this is different

BuildingReports, InspectPoint, and similar platforms include impairment-related fields. A technician can log that a system was taken offline, record a reason, and note restoration. The data entry exists. What doesn't exist is enforcement.

In those platforms, the AHJ notification step is a field — not a gate. A technician can leave it blank and close the record. The main drain test is a data point, not a required step that blocks closure. The platforms are built to record what happened; they are not built to enforce that the right things happened before the record is considered complete.

ImpairmentOS's differentiator is the state machine making the compliant path the only path. The technician cannot produce a closed impairment record without satisfying the jurisdiction-specific requirements. The Impairment Packet is not just a report — it is a compliance certificate, because the system enforces compliance as a precondition of generating it. No current platform produces that artifact.

The secondary differentiator is the Impairment Packet as a standalone, portable audit document. A PDF that a contractor can hand to a fire marshal or email to a carrier's underwriter on request. It doesn't require the recipient to have access to the platform or understand how to navigate it.

### Who resists, and how to address it

**Field technicians (the Mike DiSalvo archetype)** will initially experience ImpairmentOS as paperwork. They are right that documentation doesn't stop frozen pipes. The response is speed: every default is pre-populated, the property lookup is one tap, the AHJ contact information appears automatically, and the main drain test differential is calculated for them. The compliant workflow has to be faster than the notebook. If it is, resistance dissipates within the first real impairment.

**Contractors (the Tom Beacon archetype)** will initially frame this as a cost with no immediate return. They are protected systems that have worked for years; nobody has come after them. The response is to make the post-incident cost concrete. Beacon is currently spending thousands in legal fees defending a 5h 50m impairment from four months ago because their record doesn't exist. ImpairmentOS doesn't change what happened at Cedar Heights — but if it had been in use, there would be a timestamped Impairment Packet showing AHJ notification at 07:55, fire watch from 08:00–13:30, and a main drain test result, all signed off by T. Beacon. That document ends the NOV inquiry in the first meeting. The insurance exposure, the legal fees, the carrier scrutiny — they don't exist.

**Some property managers** will push back on impairment documentation creating a paper trail that their carrier will ask about. This is real. The response is that the paper trail already exists — it's in the AHJ's enforcement records, not yours. A documented impairment that was handled correctly is a carrier asset: it shows a contractor who follows code and maintains records. An undocumented impairment that surfaces post-incident, as Cedar Heights demonstrates, is a liability. ImpairmentOS exists to make the documented case the one that's true.

---

## Prototype

**Start the prototype:** 
**[Try ImpairmentOS →](https://impairmentos-production.up.railway.app)**

**What's built:**

| Feature | How to see it |
|---------|---------------|
| Cedar Heights scenario (broken state) | Dashboard → active impairments — BLOCKED badge with 2 violations |
| Dunmoor Hospital scenario (compliant, mid-workflow) | Dashboard → active impairments — AHJ notified within 30-min ✓ |
| Hartwell Commons (clean closed) | Dashboard → recently closed — green, all steps complete |
| Enforcement visibility | Red BLOCKED badge, violation one-liners with Fix→ links |
| State machine enforcement | Take Action → try to close Cedar Heights without fixing violations |
| Impairment Packet | View Timeline → structured audit document with compliance checklist |
| Records Export | "Export Records" in NavBar → select property + date range → structured document |
| Properties Overview | "Properties" tab → portfolio view with compliance status dots |
| Deficiency tracking | Properties → click "▼ Details" on Cedar Heights → 2 open deficiencies |
| Cedar Heights walkthrough | "▶ Cedar Heights Demo" in NavBar → 6-step guided demo |
| Demo reset | "↺ Reset Demo" in NavBar → restores original broken state |

**To test enforcement specifically:**
1. Click "Take Action" on Cedar Heights Apartments (9th Floor Zone)
2. Navigate to the final "Close Impairment" step
3. See: the state machine returns a violation list — AHJ notification and main drain test block closure
4. Complete both steps (record an AHJ notification + main drain test PSI readings)
5. Closure succeeds → Impairment Packet generated with all items COMPLETE

**To run the guided walkthrough:**
1. Click "▶ Cedar Heights Demo" in the navigation bar
2. Step through all 6 stages — from the field notebook to the completed audit packet
3. Step 6 includes a "Reset Demo" button to restore the broken state for re-runs
