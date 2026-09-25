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
  $demoVoice.Speak("Hi, I'm Sofia. Nice to meet you!")
  $clips = @{
    'daniel-greeting' = "Hello, I'm Daniel. Nice to meet you too!"
    'daniel-intro' = "Hi, I'm Daniel."
    'nice-to-meet-you-too' = 'Nice to meet you too!'
    'i-am-a-student' = 'I am a student.'
    'it-is-a-book' = 'It is a book.'
  }
  foreach ($clip in $clips.GetEnumerator()) {
    $demoVoice.SetOutputToWaveFile((Join-Path $PSScriptRoot ($clip.Key + '.wav')))
    $demoVoice.Speak($clip.Value)
  }
} finally { $demoVoice.Dispose() }
