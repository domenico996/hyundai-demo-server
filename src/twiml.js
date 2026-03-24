// src/twiml.js -- TwiML helpers
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Play ElevenLabs audio (or fallback to Twilio TTS) and listen for input
function speakAndGather(text, audioUrl, action) {
  const speechPart = audioUrl
    ? `<Play>${audioUrl}</Play>`
    : `<Say voice="Polly.Joanna-Neural">${escapeXml(text)}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Gather input="speech" action="${action}" method="POST"
            speechTimeout="auto" timeout="8" actionOnEmptyResult="true">
      ${speechPart}
    </Gather>
    <Redirect method="POST">${action}?SpeechResult=</Redirect>
  </Response>`;
}

// Play audio and hang up
function speakAndHangup(text, audioUrl) {
  const speechPart = audioUrl
    ? `<Play>${audioUrl}</Play>`
    : `<Say voice="Polly.Joanna-Neural">${escapeXml(text)}</Say>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    ${speechPart}
    <Hangup />
  </Response>`;
}

function error(msg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say voice="Polly.Joanna-Neural">${escapeXml(msg)}</Say>
    <Hangup />
  </Response>`;
}

module.exports = { speakAndGather, speakAndHangup, error, escapeXml };
