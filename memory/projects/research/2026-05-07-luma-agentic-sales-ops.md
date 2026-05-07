# LUMA Agentic Sales Ops Research — 2026-05-07

## Scope
Sichtung von Daniels LUMA Sales-Support-Cronjobs, Mail-/MC-Sync-Artefakten und Markt-/Tool-Recherche zu agentic Sales, AI SDR und RevOps-Automation.

## Findings
- Aktive Kernjobs: LUMA Weekly Usage Report HTML (Fr 09:00, Sales Topic 23), Weekly GTM Pulse (Fr 18:00, Sales Topic 23), LUMA Daily Mini Briefing (18:00), LUMA Unified Mail State Monitor (alle 10 Minuten).
- Mehrere ältere/überlappende Sales-Jobs sind pausiert: LUMA Inbox Monitor 09/13/17:30, Daily Email Commitments Reminder, Post-Onboarding Daily Open Todos, Unified Sales Sync, Sent Mail Commitments Sync, Inbox MC Monitor.
- `luma_sales_unified_sync_context.py` läuft manuell erfolgreich und liefert Mailbox/MC/Tracker-Kontext.
- `luma_mail_state.py` läuft manuell erfolgreich und erkennt u.a. 35 tracked threads, 15 open reply threads, 2 open commitments, 1 stale commitment, 1 unmatched reply thread.
- Scheduler zeigt für den aktiven Unified Mail State Monitor trotzdem `last_status: error`; wahrscheinlich Cron-Prompt/Toolset/Output-Verarbeitung statt Script-Basisproblem.

## Market Research
- Common Room: buyer intelligence, signals, dark funnel, product-led sales, DataAgent, Actions, MCP.
- Clay: Claygent, Signals/Intent, native Sequencer, AI/natural-language GTM workflow building.
- HubSpot: Breeze Prospecting Agent.
- Salesforce: Agentforce Sales for prospecting, lead engagement, pipeline management and account growth.
- Lindy: AI sales agents for lead lists, custom outreach, CRM updates, sales coaching.
- Gartner/McKinsey: task-specific AI agents and broad experimentation with AI agents are becoming mainstream.
- X/Grok output was useful only as sentiment: strong AI SDR/RevOps hype, but specific tweet details were not treated as reliable citations.

## Recommendation
Build in three levels:
1. Stabilize: fix active mail-state cron status, consolidate paused jobs, define one sales-state schema, strict `[SILENT]` no-delta behavior.
2. Augment: Deal-Radar, Reply-or-Ignore classifier, usage-to-next-best-action, automated call prep.
3. Autonomize: guarded MC writes, draft preparation, lead signal scout, daily voice digest.

Primary next build: turn `luma_mail_state.py` into a reliable Deal-Radar-Agent connecting Gmail + MC + Usage + tracker state.
