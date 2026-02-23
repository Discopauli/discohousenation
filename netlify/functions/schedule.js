exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800' 
  };
  
  try {
    // 1. Fetch using modern API to follow redirects and bypass basic bot blocks
    const response = await fetch('https://www.discohousenation.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });
    
    let html = await response.text();

    // 2. NUKE THE ZOMBIES: Using Hex codes so GitHub doesn't eat the regex
    // This finds and removes everything between them
    html = html.replace(/\x3C\x21\x2D\x2D[\s\S]*?\x2D\x2D\x3E/g, ' ');

    // 3. Nuke scripts and styles
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

    // 4. Decode WordPress HTML entities (The "Miss G" apostrophe fix)
    html = html.replace(/&#8211;/g, '-')
               .replace(/&#8212;/g, '-')
               .replace(/&ndash;/g, '-')
               .replace(/&mdash;/g, '-')
               .replace(/&#8217;/g, "'") 
               .replace(/&amp;/g, '&')
               .replace(/&nbsp;/g, ' ');
    
    // 5. Strip tags and crush spaces
    let rawText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'LISTEN NOW'];
    const schedule = {};
    let totalSlots = 0;

    // Isolate schedule block to avoid parsing headers/footers
    const startIdx = rawText.search(/DJ SCHEDULE/i);
    if (startIdx !== -1) {
      rawText = rawText.substring(startIdx);
    }

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

      // Look for "Time - DJ - Show" pattern
      const slotRegex = /(\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM))\s*[-–—]\s*(.*?)(?=\s*\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM)|$)/gi;

      let match;
      while ((match = slotRegex.exec(dayContent)) !== null) {
        let time = match[1].trim().toLowerCase().replace(/\s+/g, '');
        let restInfo = match[2].trim();

        let parts = restInfo.split(/\s*[-–—]\s*/);
        let dj = parts[0] ? parts[0].trim() : '';
        let show = parts[1] ? parts.slice(1).join(' - ').trim() : '';

        if (dj) {
          const slot = { time, dj };
          if (show) slot.show = show;
          slots.push(slot);
          totalSlots++;
        }
      }

      if (slots.length > 0) {
        const dayProper = currentDay.charAt(0) + currentDay.slice(1).toLowerCase();
        schedule[dayProper] = slots;
      }
    }

    const dayCount = Object.keys(schedule).length;
    if (dayCount < 3 || totalSlots === 0) {
      throw new Error(`Parsed ${dayCount} days and ${totalSlots} slots - check source formatting`);
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
      body: JSON.stringify({ error: err.message, source: 'error' }),
    };
  }
};
