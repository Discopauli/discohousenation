exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache' // No caching while we debug
  };
  
  try {
    // Using native fetch: it handles redirects and we disguise it as Chrome
    const response = await fetch('https://www.discohousenation.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    });
    
    const html = await response.text();
    
    // Let's X-Ray exactly what we got back
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        diagnostic_mode: true,
        http_status: response.status,
        was_redirected: response.redirected,
        final_url: response.url,
        html_file_size: html.length,
        contains_monday: html.toUpperCase().includes('MONDAY'),
        contains_schedule: html.toUpperCase().includes('DJ SCHEDULE'),
        // Spitting out the first 500 characters so we can read the server's response
        html_preview: html.substring(0, 500) 
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
