import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('/tmp/playlist.json', 'utf-8'));
const tracks = data?.playlist?.tracks ?? [];
console.log('Loaded', tracks.length, 'songs from playlist file');

// The NCM proxy already maps songs to: { id, title, artist, album, coverUrl, durationMs }
console.log('Sample raw track:', JSON.stringify(tracks[0]));

const db = new Database('./data/ai-radio.sqlite');
const now = new Date().toISOString();

// Clear existing songs first
db.exec('DELETE FROM songs');

const insert = db.prepare('INSERT OR REPLACE INTO songs (id, source, title, artist, album, cover_url, duration_ms, raw, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const tx = db.transaction(() => {
  for (const t of tracks) {
    insert.run(
      String(t.id),
      'netease',
      t.title || '',
      t.artist || '',
      t.album || '',
      t.coverUrl || '',
      t.durationMs || 0,
      JSON.stringify(t),
      now
    );
  }
});
tx();

const count = db.prepare('SELECT COUNT(*) as c FROM songs').get();
console.log('Total songs in DB:', count.c);

const sample = db.prepare('SELECT title, artist, album FROM songs ORDER BY RANDOM() LIMIT 10').all();
console.log('\nRandom sample:');
for (const s of sample) console.log('  ' + s.title + ' - ' + s.artist + ' (' + s.album + ')');

db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run('default_playlist_id', '8624020658', now);
db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run('default_playlist_name', 'hllqk喜欢的音乐', now);
db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run('default_playlist_count', String(tracks.length), now);

db.close();
console.log('\nDone! hllqk喜欢的音乐 (' + tracks.length + '首) imported as default playlist.');
