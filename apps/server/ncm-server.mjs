import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// UnblockNeteaseMusic - multi-source song matching
let matchSong = null;
try {
  const mod = await import("@neteasecloudmusicapienhanced/unblockmusic-utils");
  matchSong = mod.matchID || mod.default?.matchID;
  if (matchSong) {
    console.log("[ncm] UnblockNeteaseMusic loaded - multi-source matching available");
  }
} catch (e) {
  console.warn("[ncm] UnblockNeteaseMusic not available:", e.message);
}

const PORT = 3000;
const BASE = "https://music.163.com";
const AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// NCM Cookie - MUSIC_U is the key authentication token
const NCM_COOKIE = "MUSIC_U=00BCA05A82A64AD7DF7ABDE0B4EE5394A6B853EE51BF3D18C8A67D476064476BCBC19CC22258989B6DC1CF5A0EB4D10F36B49666CB93ABB7E4ED2A3033F035F1530D465304F52116ECF678C23F30FC469CDD1042928D7743F18C6F8EF49533AD64A946D84D72A2AF2A6EB5CD32BD952A650035CD44791D14CB94E69512831E46B38534F0216413F4629BF268BD9765EA98AB4686989FA06DAC1F035323820B65E2858286986866541DF5D582B52133C38CA3DF80D8BACF2C0550F410818641207D9FA6966505D9103106FF05C8D6E0DA236D2F4341F40544EAA4FB0F1D2447F2C2E7F6552314EA4C9BA173F591F296DA3F0397E509FE93F1B924502D9AFB11678D7BEB7608F38C8DEB9FFB597A8F55A8208FAC4398FFD9D8564080815746D50B6AB0BA179F4588AB2A103E83794963535F7F28FFD4F8BF2C4E1BD08D018B205958ACB1CF61E12AA2DBE133F066DE63CC7CA57B07A7D8E5EADDE8228D5AD2EE6B5955F096C3D0C27C7D1C1FE07F5E4E50F8687FD4C32DB9CD015D819E2D9F79CED1F94DBBD6318B6EB50CE3C5C90C0DFF4AEAF1C16F07CD529B87C3E89002CB1AA4; __csrf=975ec176bf8aad605fab5433d08aa6a3";

// weapi encryption
const SECRET_KEY = "0CoJUm6Qyw8W8jud";
const IV = "0102030405060708";
const PUBKEY = "010001";
const MODULUS = "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";

function aesEncrypt(text, key) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, IV);
  let enc = cipher.update(text, "utf8", "base64");
  enc += cipher.final("base64");
  return enc;
}

function rsaEncrypt(text) {
  const reversed = text.split("").reverse().join("");
  const hex = Buffer.from(reversed, "utf8").toString("hex");
  const biText = BigInt("0x" + (hex || "0"));
  const biMod = BigInt("0x" + MODULUS);
  const biPub = BigInt("0x" + PUBKEY);
  let biResult = 1n;
  let base = biText % biMod;
  let exp = biPub;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      biResult = (biResult * base) % biMod;
    }
    exp = exp / 2n;
    base = (base * base) % biMod;
  }
  return biResult.toString(16).padStart(256, "0");
}

function weapiEncrypt(text) {
  const randKey = crypto.randomBytes(16).toString("hex").slice(0, 16);
  const first = aesEncrypt(text, SECRET_KEY);
  const second = aesEncrypt(first, randKey);
  const encSecKey = rsaEncrypt(randKey);
  return { params: second, encSecKey };
}

async function ncmPost(path, body) {
  const { params, encSecKey } = weapiEncrypt(JSON.stringify(body));
  const form = `params=${encodeURIComponent(params)}&encSecKey=${encodeURIComponent(encSecKey)}`;

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "User-Agent": AGENT,
      Referer: "https://music.163.com/",
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: NCM_COOKIE,
    },
    body: form,
  });
  return res.json();
}

async function ncmGet(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": AGENT, Referer: "https://music.163.com/", Cookie: NCM_COOKIE },
  });
  return res.json();
}

function mapSong(raw) {
  const artists = raw.artists ?? raw.ar ?? [];
  const album = raw.album ?? raw.al ?? {};
  return {
    id: String(raw.id),
    title: raw.name ?? "",
    artist: artists.map((a) => a.name).join(", "),
    album: album.name ?? "",
    coverUrl: album.picUrl ?? "",
    durationMs: raw.duration ?? raw.dt ?? 0,
  };
}

async function getYoutubeAudioUrl(query) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--no-playlist",
      "--get-url",
      "-f", "bestaudio[ext=m4a]/bestaudio",
      `ytsearch1:${query}`,
    ], { timeout: 15000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (url.pathname === "/search") {
      const kw = url.searchParams.get("keywords") ?? "";
      const limit = Number(url.searchParams.get("limit") ?? "10");
      const data = await ncmPost("/weapi/search/get", { s: kw, type: 1, limit, offset: 0 });
      const songs = (data?.result?.songs ?? []).map(mapSong);
      res.end(JSON.stringify({ result: { songs } }));
    } else if (url.pathname === "/song/url") {
      const id = url.searchParams.get("id") ?? "";
      const title = url.searchParams.get("title") ?? "";
      const artist = url.searchParams.get("artist") ?? "";
      const br = url.searchParams.get("br") ?? "320000";

      // Try NCM first - use eapi endpoint for better URL compatibility
      let data = await ncmPost("/weapi/song/enhance/player/url/v1", {
        ids: [id],
        level: "exhigh",
        encodeType: "mp3",
        br: Number(br),
      });

      // If no URL or URL is null, try alternative endpoint
      const item0 = data?.data?.[0];
      if (!item0?.url) {
        try {
          const altData = await ncmPost("/weapi/song/enhance/player/url", {
            ids: [id],
            br: Number(br),
          });
          if (altData?.data?.[0]?.url) {
            data = altData;
          }
        } catch {}
      }

      const item = data?.data?.[0];
      if (!item?.url && title) {
        // Fallback to YouTube
        const query = artist ? `${title} ${artist}` : title;
        const ytUrl = await getYoutubeAudioUrl(query);
        if (ytUrl) {
          data.data[0].url = ytUrl;
          data.data[0].type = "mp4a";
        }
      }
      res.end(JSON.stringify(data));
    } else if (url.pathname === "/lyric") {
      const id = url.searchParams.get("id") ?? "";
      const data = await ncmGet("/api/song/lyric", { id, lv: 1, tv: 1, yrc: 1 });
      res.end(JSON.stringify(data));
    } else if (url.pathname === "/playlist/detail") {
      const id = url.searchParams.get("id") ?? "";
      const data = await ncmPost("/weapi/v6/playlist/detail", { id, n: 100000, s: 8 });
      res.end(JSON.stringify({ playlist: { tracks: (data?.playlist?.tracks ?? []).map(mapSong) } }));
    } else if (url.pathname === "/user/playlist") {
      const uid = url.searchParams.get("uid") ?? "";
      const limit = Number(url.searchParams.get("limit") ?? "50");
      try {
        const data = await ncmPost("/weapi/user/playlist", { uid, limit, offset: 0 });
        console.log("[ncm] user/playlist response status:", data?.code);
        const playlists = (data?.playlist ?? []).map((p) => ({
          id: String(p.id),
          name: p.name ?? "",
          coverUrl: p.coverImgUrl ?? p.picUrl ?? "",
          trackCount: p.trackCount ?? 0,
          creator: p.creator?.nickname ?? "",
          description: p.description ?? "",
        }));
        res.end(JSON.stringify({ playlist: playlists }));
      } catch (e) {
        console.error("[ncm] user/playlist error:", e.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    } else if (url.pathname === "/recommend/songs") {
      const data = await ncmPost("/weapi/v3/playlist/detail", { id: "3778678", n: 100000, s: 8 });
      res.end(JSON.stringify({ data: { dailySongs: (data?.playlist?.tracks ?? []).slice(0, 30).map(mapSong) } }));
    } else if (url.pathname === "/audio") {
      // Audio proxy endpoint - fetches audio from CDN with multi-source fallback
      const id = url.searchParams.get("id") ?? "";
      const title = url.searchParams.get("title") ?? "";
      const artist = url.searchParams.get("artist") ?? "";

      // Get song URL from NCM API
      const br = url.searchParams.get("br") ?? "320000";
      let data = await ncmPost("/weapi/song/enhance/player/url/v1", {
        ids: [id],
        level: "exhigh",
        encodeType: "mp3",
        br: Number(br),
      });

      let audioUrl = data?.data?.[0]?.url;

      // If no URL from weapi, try alternative endpoints
      if (!audioUrl) {
        try {
          const altData = await ncmPost("/weapi/song/enhance/player/url", {
            ids: [id],
            br: Number(br),
          });
          audioUrl = altData?.data?.[0]?.url;
        } catch {}
      }

      if (!audioUrl) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "no audio url" }));
        return;
      }

      // Fetch audio from CDN with proper headers
      let audioRes = await fetch(audioUrl, {
        headers: {
          "User-Agent": AGENT,
          Referer: "https://music.163.com/",
          Cookie: NCM_COOKIE,
        },
      });

      // If CDN returns 403, try UnblockNeteaseMusic multi-source matching
      if (!audioRes.ok && audioRes.status === 403 && matchSong) {
        console.log(`[ncm] CDN 403 for song ${id}, trying multi-source match...`);
        try {
          const matchResult = await matchSong(id);
          if (matchResult?.data?.url) {
            console.log(`[ncm] Found alternative source: ${matchResult.data.url.substring(0, 80)}...`);
            audioRes = await fetch(matchResult.data.url, {
              headers: {
                "User-Agent": AGENT,
                Referer: "https://music.163.com/",
              },
            });
          }
        } catch (matchErr) {
          console.error(`[ncm] Multi-source match failed:`, matchErr.message);
        }
      }

      if (!audioRes.ok) {
        res.statusCode = audioRes.status;
        res.end(JSON.stringify({ error: `CDN returned ${audioRes.status}` }));
        return;
      }

      // Stream audio to client
      res.setHeader("Content-Type", audioRes.headers.get("content-type") || "audio/mpeg");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const contentLength = audioRes.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      const reader = audioRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };
      await pump();
    } else if (url.pathname === "/cover") {
      // Cover image proxy - avoids CORS/mixed-content issues
      const imgUrl = url.searchParams.get("url") ?? "";
      if (!imgUrl || !imgUrl.startsWith("http")) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "missing or invalid url" }));
        return;
      }
      try {
        const imgRes = await fetch(imgUrl, {
          headers: { "User-Agent": AGENT, Referer: "https://music.163.com/" },
        });
        if (!imgRes.ok) {
          res.statusCode = imgRes.status;
          res.end(JSON.stringify({ error: `upstream ${imgRes.status}` }));
          return;
        }
        res.setHeader("Content-Type", imgRes.headers.get("content-type") || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Access-Control-Allow-Origin", "*");
        const reader = imgRes.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        await pump();
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    }
  } catch (err) {
    console.error("[ncm]", err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => console.log(`[ncm] API server on http://localhost:${PORT}`));
