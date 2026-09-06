# Known Issues

## ISSUE-001

- Title: Offline STT engine is not integrated yet
- Severity: High
- Status: Open
- Expected: Recorded speech is converted by an offline Windows-compatible engine.
- Actual: Browser preview now uses available Web Speech Recognition to convert speech to text and applies rule-based classroom text cleanup. A fully offline Windows STT engine is still not integrated.
- Next step: Add whisper.cpp sidecar and connect Tauri command output to the result dialog.

## ISSUE-002

- Title: TXT open/save uses placeholder status
- Severity: High
- Status: Open
- Expected: Ctrl+S and Ctrl+O use native file dialogs.
- Actual: Auto-save works through localStorage; native TXT import/export is not connected.
- Next step: Add Tauri dialog/fs commands.

## ISSUE-003

- Title: Always-on-top is stored but not applied
- Severity: Medium
- Status: Open
- Expected: The setting immediately updates the desktop window.
- Actual: The web UI stores the setting and shows guidance.
- Next step: Connect to Tauri window API.

## ISSUE-004

- Title: Microphone permission depends on the current browser surface
- Severity: Medium
- Status: Open
- Expected: Voice input works consistently in the packaged Windows desktop app.
- Actual: Browser preview may block or require microphone permission. The UI now reports permission and support failures clearly.
- Next step: Move microphone capture to a Tauri/native command or verify packaged WebView permission behavior.
