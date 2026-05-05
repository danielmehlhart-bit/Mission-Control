# Telegram Retrieval Bridge → Mission Control Voice

## Zielbild
Telegram soll als Zubringer in eine Mission-Control-Voice-Session dienen.
Ein Telegram-Chat oder Topic kann auf ein Voice-Profil und Kontext-Bindings gemappt werden, damit Mission Control beim Session-Start direkt den richtigen Retrieval-Kontext hydratisiert.

## State Flow
1. Telegram/Hermes meldet `telegramChatId` + optional `telegramThreadId` an Mission Control.
2. Mission Control sucht eine persistierte Bridge (`voice_telegram_bridges`).
3. Request-Bindings überschreiben gespeicherte Defaults.
4. Ein Voice-Session-Start nutzt diese Bindings direkt in der Hydration.
5. Session speichert `handoffSource`/Bridge-Metadaten für spätere Nachvollziehbarkeit.
6. Optional wird direkt eine Auto-Greeting-Assistant-Turn erzeugt.

## Scope Phase 1
- Persistente Chat/Topic→Profil/Binder-Mappings
- API-Route `POST /api/voice/handoffs/telegram`
- Reuse gespeicherter Routing-Daten bei erneutem Handoff
- Handoff-Metadaten im Session-Context und Event-Log

## Nicht in Phase 1
- Telegram-seitiger aktiver Callback/Webhook-Trigger im Gateway
- UI in Mission Control zum Verwalten der Bridges
- Vollständige Thread-Synchronisation kompletter Telegram-Historien
- Duplex-Realtime-Voice
