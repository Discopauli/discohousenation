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
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  
  // Isolate the schedule section to strip out navigation/footer noise
  const scheduleSection = html.split(/DJ\s*SCHEDULE/i)[1] || html;
  
  for (let i = 0; i < days.length; i++) {
    const currentDay = days[i];
    // Find the next day to use as a stopping point. After Sunday, the site says "LISTEN NOW"
    const nextDay = days[i + 1] || 'LISTEN NOW';
    
    // Split the raw HTML using the day names as anchors, ignoring tags completely
    const dayRegex = new RegExp(`(?:>|\\b)${currentDay}(?:<|\\b)([\\s\\S]*?)(?:(?:>|\\b)${nextDay}(?:<|\\b)|LISTEN NOW)`, 'i');
    
    const dayMatch = scheduleSection.match(dayRegex);
    if (!dayMatch) continue;
    
    const dayContent = dayMatch[1];
    const slots = [];
    
    // Regex for times/DJs, handles typos on the site like "8,30pm"
    const lineRegex = /(\d{1,2}(?:[:,.]?\d{2})?\s*(?:am|pm|AM|PM))\s*[–\-—]\s*([^–\-—<\n]+?)(?:\s*[–\-—]\s*([^<\n]+?))?(?:\s*<|$|\n)/g;
    
    let match;
    while ((match = lineRegex.exec(dayContent)) !== null) {
      let time = match[1].trim().toLowerCase().replace(/\s+/g, '');
      let dj = match[2].trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
      let show = match[3] ? match[3].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim() : '';
      
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
      throw new Error(`Only parsed ${dayCount} days - website format may have changed`);
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
