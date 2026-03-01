exports.handler = async function(event, context) {
    const headers = {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, max-age=0'
    };

    try {
          const resp = await fetch('https://hello.citrus3.com:2020/api/nowplaying/discohousenation');
          if (!resp.ok) throw new Error('AzuraCast API error: ' + resp.status);
          const data = await resp.json();

      const np = data.now_playing || {};
          const song = np.song || {};
          const live = data.live || {};
          const next = (data.playing_next || {}).song || {};

      return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                        artist: song.artist || '',
                        title: song.title || '',
                        art: song.art || '',
                        duration: np.duration || 0,
                        elapsed: np.elapsed || 0,
                        listeners: (data.listeners || {}).current || 0,
                        is_live: live.is_live || false,
                        live_name: live.streamer_name || '',
                        next_artist: next.artist || '',
                        next_title: next.title || '',
                        updated: new Date().toISOString()
              })
      };
    } catch (e) {
          return {
                  statusCode: 200,
                  headers,
                  body: JSON.stringify({ error: e.message, artist: '', title: '', is_live: false })
          };
    }
};
