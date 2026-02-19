# Commented-Out Channels (Telegram + Discord Only)

Use the line numbers below to revert any channel or copy that was commented out. Remove the `/* ... */` or `//` comment markers and restore any associated imports if needed.

## components/forms/channel-selector.tsx
- Lines 32-58: WhatsApp channel definition commented out.
- Lines 83-135: Slack, Signal, Google Chat, Matrix, MS Teams channel definitions commented out.
- Line 9: Icon imports trimmed to `Send, Hash`. If you re-enable any commented channels, re-add their icons (`MessageSquare, Zap, Phone, Mail, Grid, Users`) to this import.

## components/forms/template-selection.tsx
- Line 16: WhatsApp chip commented out in `support` template.
- Line 23: WhatsApp channel commented out in `support` template preset.
- Line 36: WhatsApp chip commented out in `assistant` template.
- Line 46: WhatsApp channel commented out in `assistant` template preset.
- Lines 70-87: Entire Slack template (`team-collab`) commented out.

## app/page.tsx
- Line 124: Old “Pair Channels” detail string with WhatsApp/Slack commented out.
- Line 163: Old “Channel‑ready” copy with WhatsApp/Slack commented out.
- Lines 197-205: Channels list array entries commented out (WhatsApp, Slack, Signal, Google Chat, Matrix, MS Teams).

## app/(marketing)/pricing/page.tsx
- Line 21: “All channels (WhatsApp, Telegram, Discord, etc.)” commented out in Monthly features.
- Line 40: Same line commented out in 3 Months features.
- Line 59: Same line commented out in Yearly features.
- Line 139: “All channels” badge line commented out in hero bullets.

## app/layout.tsx
- Line 10: Old metadata description with WhatsApp and “and more” commented out.
