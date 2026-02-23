exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800' // Caching restored to 30 mins
  };
  
  try {
    // 1. Fetch using modern API to bypass blocks and follow redirects
    const response = await fetch('https://www.discohousenation.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    let html = await response.text();

    // 2. THE FIX: Decode WordPress HTML entities before parsing
    html = html.replace(/&#8211;/g, '-')
               .replace(/&#8212;/g, '-')
               .replace(/&ndash;/g, '-')
               .replace(/&mdash;/g, '-')
               .replace(/&#8217;/g, "'") // The apostrophe fix
               .replace(/&amp;/g, '&')
               .replace(/&nbsp;/g, ' ');

    // 3. Nuke scripts and styles
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    
    // 4. Strip tags and crush spaces
    let rawText = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'LISTEN NOW'];
    const schedule = {};
    let totalSlots = 0;

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

      // 6. Regex looking for literal dashes (which we just restored)
      const slotRegex = /(\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM))\s*[-–—]\s*(.*?)(?=\s*\d{1,2}(?:[:,.]\d{2})?\s*(?:am|pm|AM|PM)|$)/gi;

      let match;
      while ((match = slotRegex.exec(dayContent))
