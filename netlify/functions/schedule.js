const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DHN-App/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseSchedule(html) {
  const schedule = {};
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'LISTEN NOW'];
  
  // 1. Nuke scripts and styles so we don't accidentally parse background code
  let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  // 2. Strip ALL HTML tags, leaving only raw text
  let rawText = cleanHtml.replace(/<[^>]+>/g, ' ');
  
  // 3. Crush multiple spaces and newlines into single spaces
  rawText = rawText.replace(/\s+/g, ' ');

  // 4. Find where the schedule actually begins to ignore the top menu
  const startIdx = rawText.search(/DJ SCHEDULE/i);
  if (startIdx !== -1) {
    rawText = rawText.substring(startIdx);
  }

  // 5. Slice up the text block day by day
  for (let i = 0; i < 7; i++) {
    const currentDay = days[i];
    const nextDay = days[i + 1];

    const startRegex = new RegExp('\\b' + currentDay + '\\b', 'i');
    const endRegex = new RegExp('\\b' + nextDay + '\\b', 'i');

    const startMatch = rawText.match(startRegex);
    if (!startMatch) continue;

    const dayStartPos = startMatch.index;
    let endPos = rawText.length;

    const textAfterCurrent = rawText.substring(dayStartPos + currentDay.length);
    const endMatch = textAfterCurrent.match(endRegex);

    if (endMatch) {
      endPos = dayStartPos + currentDay.length + endMatch.index;
    }

    const dayContent = rawText.substring(dayStartPos + currentDay.length, endPos).trim();
    const slots = [];

    // 6. Look for "Time - DJ - Show" then stop before the next time slot
    const slotRegex = /(\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM))\s*[–\-—]\s*(.*?)(?=\s*\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM)|$)/gi;

    let match;
    while ((match = slotRegex.exec(dayContent)) !== null) {
      let time = match[1].trim().toLowerCase().replace(/\s+/g, '');
      let restInfo = match[2].trim();

      // Split the DJ name from the Show Name using the dashes
      let parts = restInfo.split(/\s*[–\-—]\s*/);
      let dj = parts[0] ? parts[0].trim() : '';
      let show = parts[1] ? parts.slice(1).join(' - ').trim() : '';

      if (dj) {
        const slot = { time, dj };
        if (show) slot.show = show;
        slots.push(slot);
      }
    }

    if (slots.length > 0) {
      const dayProper = currentDay.charAt(0) + currentDay.slice(1).toLowerCase();
      schedule[dayProper] = slots;
    }
  }

  return schedule;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800', 
  };
  
  try {
    const html = await fetchPage('https://www.discohousenation.com/');
    const schedule = parseSchedule(html);
    
    const dayCount = Object.keys(schedule).length;
    if (dayCount < 3) {
      throw new Error(`Only parsed ${dayCount} days - website format changed radically`);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        schedule,
        updated: new Date().toISOString(),
        source: 'live',
        days: dayCount,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message,
        source: 'error',
      }),
    };
  }
};
