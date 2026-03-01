// DHN Dashboard Stats - Fetches live listener data from CentovaCast
// Endpoint: /.netlify/functions/dashboard-stats

const https = require('https');

function fetchPlayerInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'hello.citrus3.com',
      port: 2020,
      path: '/AudioPlayer/discohousenation/playerInfo',
      method: 'GET',
      headers: { 'User-Agent': 'DHN-Dashboard/1.0' },
      rejectUnauthorized: false,
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from CentovaCast'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const info = await fetchPlayerInfo();

    // Parse the now playing string - CentovaCast format: "ARTIST - TITLE" or just title
    let artist = '';
    let title = info.nowplaying || 'Unknown';
    if (info.nowplaying && info.nowplaying.includes(' - ')) {
      const parts = info.nowplaying.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    const response = {
      listeners: info.connections || 0,
      now_playing: {
        raw: info.nowplaying || '',
        artist: artist,
        title: title
      },
      stream_status: 'online',
      timestamp: new Date().toISOString(),
      source: 'centovacast'
    };

    return { statusCode: 200, headers, body: JSON.stringify(response) };
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        listeners: 0,
        now_playing: { raw: '', artist: '', title: 'Stream data unavailable' },
        stream_status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
