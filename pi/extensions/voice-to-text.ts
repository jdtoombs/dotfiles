import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const psScript = String.raw`
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech

$recognizerInfo = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() |
  Where-Object { $_.Culture.Name -eq "en-US" } |
  Select-Object -First 1

if ($null -eq $recognizerInfo) {
  throw "No en-US Windows speech recognizer is installed."
}

$recognizer = [System.Speech.Recognition.SpeechRecognitionEngine]::new($recognizerInfo)
try {
  $recognizer.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
  $recognizer.SetInputToDefaultAudioDevice()

  # Wait for speech to start, then let recognition finish naturally after silence.
  $recognizer.InitialSilenceTimeout = [TimeSpan]::FromSeconds(8)
  $recognizer.BabbleTimeout = [TimeSpan]::FromSeconds(8)
  $recognizer.EndSilenceTimeout = [TimeSpan]::FromSeconds(2)
  $recognizer.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(2)

  $result = $recognizer.Recognize()

  if ($null -eq $result -or [string]::IsNullOrWhiteSpace($result.Text)) {
    exit 2
  }

  Write-Output $result.Text
} finally {
  $recognizer.Dispose()
}
`;

export default function (pi: ExtensionAPI) {
  async function transcribeIntoEditor(ctx: any) {
    if (!ctx.hasUI) return;

    ctx.ui.setStatus("voice-to-text", "🎙️ Listening… speak now");
    try {
      const result = await pi.exec(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { timeout: 90_000 },
      );

      const text = result.stdout.trim();
      if (result.code === 0 && text) {
        ctx.ui.pasteToEditor(text);
        ctx.ui.notify("Voice text inserted", "info");
      } else {
        const message = result.stderr.trim() || "No speech recognized.";
        ctx.ui.notify(`Voice-to-text failed: ${message}`, "warning");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Voice-to-text failed: ${message}`, "error");
    } finally {
      ctx.ui.setStatus("voice-to-text", undefined);
    }
  }

  pi.registerCommand("v", {
    description: "Dictate text into the pi editor",
    handler: async (_args, ctx) => transcribeIntoEditor(ctx),
  });
}
