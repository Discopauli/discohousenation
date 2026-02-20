// Netlify Function: Fetches DJ schedule from discohousenation.com
// Runs server-side so no CORS issues
// Called by the app at /.netlify/functions/schedule

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
  
  // Find the schedule section
  const scheduleSection = html.split(/DJ\s*SCHEDULE/i)[1] || html;
  
  for (let i = 0; i < days.length; i++) {
    const dayUpper = days[i];
    const dayProper = dayUpper.charAt(0) + dayUpper.slice(1).toLowerCase();
    
    // Find content between this day header and the next day header (or end)
    const nextDay = days[i + 1] || 'SOME_ENDING_MARKER';
    
    // Match the day section - look for h3 tags or bold day names
    const dayRegex = new RegExp(
      `(?:<h3[^>]*>\\s*${dayUpper}\\s*<\\/h3>|###\\s*${dayUpper})([\\s\\S]*?)(?=<h3[^>]*>\\s*(?:${nextDay}|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\\s*<\\/h3>|###\\s*(?:${nextDay}|$)|$)`,
      'i'
    );
    
    const dayMatch = scheduleSection.match(dayRegex);
    if (!dayMatch) continue;
    
    const dayContent = dayMatch[1];
    const slots = [];
    
    // Parse time slots - match patterns like "6pm – DJ Name – Show Name" or "6pm – DJ Name"
    // Handle various dash types and formats
    const lineRegex = /(\d{1,2}(?:[:,.]?\d{2})?\s*(?:am|pm|AM|PM))\s*[–\-—]\s*([^–\-—<\n]+?)(?:\s*[–\-—]\s*([^<\n]+?))?(?:\s*<|$|\n)/g;
    
    let match;
    while ((match = lineRegex.exec(dayContent)) !== null) {
      let time = match[1].trim().toLowerCase().replace(/\s+/g, '');
      let dj = match[2].trim();
      let show = match[3] ? match[3].trim() : '';
      
      // Clean up HTML entities and tags
      dj = dj.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
      show = show.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
      
      // Remove trailing <br or similar
      dj = dj.replace(/\s*<.*$/, '').trim();
      show = show.replace(/\s*<.*$/, '').trim();
      
      if (dj) {
        const slot = { time, dj };
        if (show) slot.show = show;
        
        // Flag DiscoPauli
        if (dj.toLowerCase().includes('discopauli')) {
          slot.highlight = true;
        }
        
        slots.push(slot);
      }
    }
    
    if (slots.length > 0) {
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
    'Cache-Control': 'public, max-age=1800', // Cache for 30 mins
  };
  
  try {
    const html = await fetchPage('https://www.discohousenation.com/');
    const schedule = parseSchedule(html);
    
    // Check we actually got data
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
