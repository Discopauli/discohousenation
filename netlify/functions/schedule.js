exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800'
  };

  try {
    const response = await fetch('https://www.discohousenation.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    let html = await response.text();

    html = html.replace(/\x3C\x21\x2D\x2D[\s\S]*?\x2D\x2D\x3E/g, ' ');
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

    html = html
      .replace(/&#8211;/g, '-').replace(/&#8212;/g, '-')
      .replace(/&ndash;/g, '-').replace(/&mdash;/g, '-')
      .replace(/&#8217;/g, "'").replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ');

    let rawText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'LISTEN NOW'];
    const schedule = {};
    let totalSlots = 0;

    const startIdx = rawText.search(/DJ SCHEDULE/i);
    if (startIdx !== -1) rawText = rawText.substring(startIdx);

    for (let i = 0; i < 7; i++) {
      const currentDay = days[i];
      const nextDay = days[i + 1];

      const startMatch = rawText.match(new RegExp('\\b' + currentDay + '\\b', 'i'));
      if (!startMatch) continue;

      const dayStartPos = startMatch.index;
      let endPos = rawText.length;
      const textAfterCurrent = rawText.substring(dayStartPos + currentDay.length);
      const endMatch = textAfterCurrent.match(new RegExp('\\b' + nextDay + '\\b', 'i'));
      if (endMatch) endPos = dayStartPos + currentDay.length + endMatch.index;

      const dayContent = rawText.substring(dayStartPos + currentDay.length, endPos).trim();
      const slots = [];

      const slotRegex = /(\d{1,2}(?:[:.,-]\d{2})?\s*(?:am|pm))\s*[-\u2013\u2014]?\s*(.*?)(?=\s*\d{1,2}(?:[:.,-]\d{2})?\s*(?:am|pm)|$)/gi;

      let match;
      while ((match = slotRegex.exec(dayContent)) !== null) {
        let time = match[1].trim().toLowerCase().replace(/\s+/g, '');
        let restInfo = match[2].trim();
        let parts = restInfo.split(/\s*[-\u2013\u2014]\s*/);
        let dj = parts[0] ? parts[0].trim() : '';
        let show = parts[1] ? parts.slice(1).join(' - ').trim() : '';

        if (dj && dj.length > 1) {
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
      throw new Error('Parsed ' + dayCount + ' days and ' + totalSlots + ' slots - check source formatting');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ schedule, updated: new Date().toISOString(), source: 'live', days: dayCount }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, source: 'error' }),
    };
  }
};
