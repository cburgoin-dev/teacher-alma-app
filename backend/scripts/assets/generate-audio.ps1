# Optional regeneration only. The WAV is versioned; no speech engine runs during lessons.
# Run in Windows PowerShell (System.Speech), using the installed English voice.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$demoVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $demoVoice.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, [System.Globalization.CultureInfo]::GetCultureInfo('en-US'))
  $demoVoice.Rate = -1
  $demoVoice.SetOutputToWaveFile((Join-Path $PSScriptRoot 'nice-to-meet-you.wav'))
  $demoVoice.Speak('Nice to meet you!')
  $demoVoice.SetOutputToWaveFile((Join-Path $PSScriptRoot 'sofia-greeting.wav'))
  $demoVoice.Speak('Hi, I am Sofia. Nice to meet you!')
} finally { $demoVoice.Dispose() }
