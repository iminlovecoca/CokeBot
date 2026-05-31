const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} = require("@discordjs/voice");
const playdl = require("play-dl");
const discordPlayerClient = require("./discordPlayerClient");
const { EmbedBuilder } = require("discord.js");
const { UserFriendlyError } = require("./errors");

const DEFAULT_VOLUME = 0.5;
const MAX_HISTORY_SIZE = 50;
const IDLE_DISCONNECT_MS = 5 * 60 * 1000;

const getMusicQueues = (client) => {
  if (!client.musicQueues) {
    client.musicQueues = new Map();
  }

  return client.musicQueues;
};

const formatDuration = (durationRaw) => durationRaw || "LIVE";

const getThumbnail = (song) =>
  song.thumbnail || song.thumbnails?.[0]?.url || null;

const getVideoId = (source) =>
  source.id ||
  source.videoId ||
  source.video_id ||
  source.video_details?.id ||
  source.video_details?.video_id ||
  null;

const getSongUrl = (source) => {
  const rawUrl = source.url || source.video_details?.url;
  if (rawUrl) {
    return rawUrl;
  }

  const videoId = getVideoId(source);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
};

const getPlayableSongUrl = (song) =>
  song.url ||
  song.playbackUrl ||
  (song.videoId ? `https://www.youtube.com/watch?v=${song.videoId}` : null);

const buildSong = (source, requestedBy) => ({
  title: source.title || source.video_details?.title || "Unknown title",
  url: getSongUrl(source),
  playbackUrl: getSongUrl(source),
  videoId: getVideoId(source),
  duration: formatDuration(
    source.durationRaw || source.duration || source.video_details?.durationRaw,
  ),
  channelName:
    source.channel?.name ||
    source.uploader ||
    source.author?.name ||
    source.video_details?.channel?.name ||
    "YouTube",
  thumbnail: getThumbnail(source),
  requestedBy,
});

const resolveSong = async (query, requestedBy) => {
  if (!query) {
    throw new UserFriendlyError("Hãy nhập tên bài hát hoặc link YouTube.");
  }

  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) {
    const validation = playdl.yt_validate(query);
    if (validation === "playlist") {
      throw new UserFriendlyError(
        "Hiện tại mình chỉ hỗ trợ link video YouTube, chưa hỗ trợ playlist.",
      );
    }

    if (validation !== "video") {
      throw new UserFriendlyError("Link YouTube này chưa hợp lệ.");
    }

    const info = await playdl.video_info(query);
    return buildSong(
      {
        ...info.video_details,
        url: info.video_details?.url || query,
        id: info.video_details?.video_id || info.video_details?.id,
      },
      requestedBy,
    );
  }

  const results = await playdl.search(query, { limit: 1 });
  if (!results.length) {
    throw new UserFriendlyError(`Không tìm thấy bài nào cho "${query}".`);
  }

  return buildSong(results[0], requestedBy);
};

const getQueue = (client, guildId) => getMusicQueues(client).get(guildId);

const destroyQueue = (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) {
    return;
  }

  if (queue.idleDisconnectTimer) {
    clearTimeout(queue.idleDisconnectTimer);
    queue.idleDisconnectTimer = null;
  }

  try {
    queue.connection?.destroy();
  } catch (error) {
    console.error("Failed to destroy music connection:", error);
  }

  getMusicQueues(client).delete(guildId);
};

const getVoiceChannelForMessage = async (message) => {
  const cachedVoiceChannel = message.member?.voice?.channel;
  if (cachedVoiceChannel) {
    return cachedVoiceChannel;
  }

  const freshMember = await message.guild.members.fetch(message.author.id);
  return freshMember.voice?.channel || null;
};

const pushPlayedSong = (queue, song) => {
  if (!song) {
    return;
  }

  queue.playedSongs.push(song);
  if (queue.playedSongs.length > MAX_HISTORY_SIZE) {
    queue.playedSongs.shift();
  }

  queue.lastSong = song;
};

const clearIdleDisconnectTimer = (queue) => {
  if (queue.idleDisconnectTimer) {
    clearTimeout(queue.idleDisconnectTimer);
    queue.idleDisconnectTimer = null;
  }
};

const scheduleIdleDisconnect = (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) {
    return;
  }

  clearIdleDisconnectTimer(queue);
  queue.idleDisconnectTimer = setTimeout(() => {
    const currentQueue = getQueue(client, guildId);
    if (!currentQueue) {
      return;
    }

    if (currentQueue.songs.length === 0 && !currentQueue.currentSong) {
      destroyQueue(client, guildId);
    }
  }, IDLE_DISCONNECT_MS);
};

const createPlayableStream = async (song) => {
  const url = getPlayableSongUrl(song);
  if (!url) {
    throw new Error(`Song "${song.title}" does not have a playable URL.`);
  }

  // Prefer yt-dlp CLI extraction + direct streaming/ffmpeg piping when available (more robust).
  const tryYtDlp = async () => {
    const { spawn } = require("child_process");
    try {
      const probeArg = url.startsWith("http") ? url : `ytsearch1:${url}`;
      const proc = spawn("yt-dlp", ["-j", probeArg]);
      let out = "";
      for await (const chunk of proc.stdout) out += chunk.toString();
      let info = null;
      try {
        info = JSON.parse(out.trim());
      } catch (parseErr) {
        const first = out.split("\n")[0];
        try {
          info = JSON.parse(first);
        } catch (e) {
          throw new Error("yt-dlp returned invalid json");
        }
      }

      // Choose an audio format (avoid thumbnails/images)
      const formats = info.formats || [];
      const audioFormats = formats
        .filter((f) => {
          try {
            if (f.acodec && f.acodec !== "none") return true;
            if (f.vcodec && f.vcodec === "none") return true;
            if (f.mime_type && f.mime_type.startsWith("audio")) return true;
            return false;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => (b.abr || b.bitrate || 0) - (a.abr || a.bitrate || 0));

      let chosenFormat = null;
      if (audioFormats.length > 0) chosenFormat = audioFormats[0];
      else if (info.url && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(info.url))
        chosenFormat = { url: info.url };
      else if (info.formats && info.formats.length > 0) {
        const candidate = info.formats.find(
          (f) => f.url && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(f.url),
        );
        if (candidate) chosenFormat = candidate;
      }

      if (!chosenFormat || !chosenFormat.url)
        throw new Error("yt-dlp did not return a playable audio URL");

      const mediaUrl = chosenFormat.url;

      // If chosen format is Opus/webm, stream it directly to save CPU
      const isOpus =
        (chosenFormat.acodec && chosenFormat.acodec.includes("opus")) ||
        (chosenFormat.ext &&
          String(chosenFormat.ext).toLowerCase() === "webm") ||
        (chosenFormat.mime_type &&
          String(chosenFormat.mime_type).toLowerCase().includes("opus"));
      if (isOpus) {
        const http = require(mediaUrl.startsWith("https:") ? "https" : "http");
        return await new Promise((resolve, reject) => {
          const req = http.get(mediaUrl, (res) => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve({ stream: res, type: StreamType.WebmOpus });
            } else {
              reject(new Error(`Unexpected status ${res.statusCode}`));
            }
          });
          req.on("error", (err) => reject(err));
        });
      }

      // Otherwise spawn ffmpeg to convert to PCM s16le 48k
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-reconnect",
          "1",
          "-reconnect_streamed",
          "1",
          "-reconnect_delay_max",
          "5",
          "-i",
          mediaUrl,
          "-f",
          "s16le",
          "-ar",
          "48000",
          "-ac",
          "2",
          "pipe:1",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      ffmpeg.stderr.on("data", (d) =>
        console.debug("ffmpeg:", d.toString().trim()),
      );
      ffmpeg.stdout.on("error", (err) =>
        console.error("ffmpeg stdout error:", err),
      );

      return { stream: ffmpeg.stdout, type: StreamType.Raw };
    } catch (err) {
      console.warn("yt-dlp extraction failed:", err?.message || err);
      throw err;
    }
  };

  try {
    return await tryYtDlp();
  } catch (ytErr) {
    console.warn(
      "yt-dlp path unavailable, falling back to play-dl/ytdl-core",
      ytErr?.message || ytErr,
    );
  }

  // Try play-dl stream first
  try {
    return await playdl.stream(url, { discordPlayerCompatibility: true });
  } catch (firstError) {
    console.warn(
      `play-dl.stream(url) failed for ${url}:`,
      firstError?.message || firstError,
    );
  }

  // Try play-dl video_info + stream_from_info
  try {
    const info = await playdl.video_info(url);
    try {
      return await playdl.stream_from_info(info, {
        discordPlayerCompatibility: true,
      });
    } catch (sfError) {
      console.warn(
        `stream_from_info(info) failed for ${url}:`,
        sfError?.message || sfError,
      );
    }
  } catch (infoError) {
    console.warn(`video_info(${url}) failed:`, infoError?.message || infoError);
  }

  // Try by videoId
  if (song.videoId) {
    try {
      const infoById = await playdl.video_info(song.videoId);
      try {
        return await playdl.stream_from_info(infoById, {
          discordPlayerCompatibility: true,
        });
      } catch (sfError2) {
        console.warn(
          `stream_from_info(infoById) failed for id=${song.videoId}:`,
          sfError2?.message || sfError2,
        );
      }
    } catch (idInfoErr) {
      console.warn(
        `video_info(id=${song.videoId}) failed:`,
        idInfoErr?.message || idInfoErr,
      );
    }
  }

  // Last resort: plain play-dl.stream
  try {
    return await playdl.stream(url);
  } catch (lastError) {
    console.error(
      `All stream attempts failed for ${url}:`,
      lastError?.message || lastError,
    );
    // Try ytdl-core fallback
    try {
      const ytdl = require("ytdl-core");
      console.warn("Falling back to ytdl-core for stream extraction.");
      const ytdlStream = ytdl(url, {
        filter: "audioonly",
        highWaterMark: 1 << 25,
      });
      ytdlStream.on("error", (err) => {
        console.error("ytdl-core stream error for", url, err?.message || err);
      });
      return { stream: ytdlStream, type: StreamType.Arbitrary };
    } catch (ytdlErr) {
      console.error(
        "ytdl-core fallback failed (or not installed). To enable fallback: npm install ytdl-core",
        ytdlErr?.message || ytdlErr,
      );
      throw lastError;
    }
  }
};

const shuffleArray = (items) => {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
};

const createQueue = async (client, message) => {
  const voiceChannel = await getVoiceChannelForMessage(message);
  if (!voiceChannel) {
    throw new UserFriendlyError("Bạn cần vào voice channel trước.");
  }

  const queue = {
    guildId: message.guild.id,
    textChannel: message.channel,
    voiceChannel,
    songs: [],
    currentSong: null,
    lastSong: null,
    playedSongs: [],
    volume: DEFAULT_VOLUME,
    idleDisconnectTimer: null,
    player: createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    }),
    connection: null,
  };

  queue.player.on(AudioPlayerStatus.Idle, async () => {
    try {
      await playNext(client, queue.guildId);
    } catch (error) {
      console.error("Failed to advance music queue:", error);
    }
  });

  queue.player.on("error", async (error) => {
    console.error("Music player error:", error);
    await queue.textChannel
      .send("⚠️ Có lỗi khi phát nhạc, mình sẽ thử chuyển qua bài tiếp theo.")
      .catch(() => {});
    try {
      await playNext(client, queue.guildId);
    } catch (nextError) {
      console.error(
        "Failed to recover music queue after player error:",
        nextError,
      );
    }
  });

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  queue.connection = connection;
  getMusicQueues(client).set(message.guild.id, queue);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (error) {
    console.warn(
      `Voice connection for guild ${message.guild.id} did not reach Ready in time, continuing anyway.`,
      error?.message || error,
    );
  }

  connection.subscribe(queue.player);
  return queue;
};

const ensureQueue = async (client, message) => {
  const existingQueue = getQueue(client, message.guild.id);
  if (existingQueue) {
    return existingQueue;
  }

  return createQueue(client, message);
};

const playNext = async (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) return null;

  const nextSong = queue.songs.shift();
  if (!nextSong) {
    queue.currentSong = null;
    scheduleIdleDisconnect(client, guildId);
    return null;
  }

  if (!nextSong.url && nextSong.videoId)
    nextSong.url = `https://www.youtube.com/watch?v=${nextSong.videoId}`;

  if (!nextSong.url) {
    console.error("Queue item is missing a playable URL:", nextSong);
    await queue.textChannel
      .send(
        `❌ Bài **${nextSong.title}** thiếu link phát hợp lệ, mình chuyển sang bài tiếp theo.`,
      )
      .catch(() => {});
    return playNext(client, guildId);
  }

  if (queue.currentSong) pushPlayedSong(queue, queue.currentSong);

  queue.currentSong = nextSong;

  // If discord-player (with optional Lavalink) is available, prefer it
  try {
    if (client.discordPlayer && queue.requestMessage) {
      const dpPlayed = await discordPlayerClient.play(
        client,
        queue.requestMessage,
        nextSong.url || nextSong.title,
      );
      if (dpPlayed) {
        queue.currentSong = nextSong;
        const embed = new EmbedBuilder()
          .setColor("#1DB954")
          .setTitle("🎶 Đang phát nhạc (Lavalink)")
          .setDescription(`**[${nextSong.title}](${nextSong.url})**`)
          .addFields(
            {
              name: "Kênh",
              value: nextSong.channelName || "YouTube",
              inline: true,
            },
            {
              name: "Thời lượng",
              value: nextSong.duration || "LIVE",
              inline: true,
            },
            { name: "Yêu cầu bởi", value: nextSong.requestedBy, inline: true },
          );
        if (nextSong.thumbnail) embed.setThumbnail(nextSong.thumbnail);
        await queue.textChannel.send({ embeds: [embed] }).catch(() => {});
        return nextSong;
      }
    }
  } catch (err) {
    console.warn(
      "discord-player playback failed, falling back to local player:",
      err?.message || err,
    );
  }

  let stream;
  try {
    stream = await createPlayableStream(nextSong);
  } catch (error) {
    console.error(`Failed to create stream for ${nextSong.url}:`, error);
    try {
      console.error(
        "Offending song object:",
        JSON.stringify(nextSong, null, 2),
      );
    } catch (e) {
      console.error("Failed to JSON stringify nextSong:", e);
    }
    await queue.textChannel
      .send(
        `❌ Không phát được **${nextSong.title}**, mình chuyển sang bài tiếp theo.`,
      )
      .catch(() => {});
    return playNext(client, guildId);
  }

  const resource = createAudioResource(stream.stream, {
    inputType: stream.type || StreamType.Arbitrary,
    inlineVolume: true,
  });
  if (resource.volume) resource.volume.setVolume(queue.volume);

  queue.player.play(resource);

  const embed = new EmbedBuilder()
    .setColor("#1DB954")
    .setTitle("🎶 Đang phát nhạc")
    .setDescription(`**[${nextSong.title}](${nextSong.url})**`)
    .addFields(
      { name: "Kênh", value: nextSong.channelName || "YouTube", inline: true },
      { name: "Thời lượng", value: nextSong.duration || "LIVE", inline: true },
      { name: "Yêu cầu bởi", value: nextSong.requestedBy, inline: true },
    );

  if (nextSong.thumbnail) embed.setThumbnail(nextSong.thumbnail);

  await queue.textChannel.send({ embeds: [embed] }).catch(() => {});
  return nextSong;
};

const addSongToQueue = async (client, message, query) => {
  const song = await resolveSong(query, message.author.tag);
  const queue = await ensureQueue(client, message);
  clearIdleDisconnectTimer(queue);
  // Attach the original request message so external players can use it
  queue.requestMessage = message;
  const wasIdle =
    queue.player.state.status === AudioPlayerStatus.Idle ||
    queue.player.state.status === AudioPlayerStatus.Paused;

  queue.songs.push(song);

  if (wasIdle && !queue.currentSong) await playNext(client, queue.guildId);

  return { queue, song };
};

const shuffleQueue = (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  if (queue.songs.length < 2)
    throw new UserFriendlyError("Hàng đợi cần ít nhất 2 bài để shuffle.");
  queue.songs = shuffleArray([...queue.songs]);
  return queue;
};

const replayCurrentSong = async (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  const songToReplay = queue.currentSong || queue.lastSong;
  if (!songToReplay) throw new UserFriendlyError("Không có bài nào để replay.");
  clearIdleDisconnectTimer(queue);
  queue.songs.unshift(songToReplay);
  queue.player.stop(true);
  return queue;
};

const replayQueue = async (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  const replayList = [
    ...queue.playedSongs,
    ...(queue.currentSong ? [queue.currentSong] : []),
    ...queue.songs,
  ];
  if (replayList.length === 0)
    throw new UserFriendlyError("Không có bài nào để replay queue.");
  clearIdleDisconnectTimer(queue);
  queue.playedSongs = [];
  queue.lastSong = null;
  queue.songs = replayList;
  queue.currentSong = null;
  queue.player.stop(true);
  return queue;
};

const formatQueue = (queue) => {
  const nowPlaying = queue.currentSong
    ? `Đang phát: **${queue.currentSong.title}**`
    : "Chưa có bài nào đang phát.";
  const upcoming = queue.songs.slice(0, 10);
  const upcomingText =
    upcoming.length > 0
      ? upcoming
          .map(
            (song, index) => `${index + 1}. ${song.title} - ${song.duration}`,
          )
          .join("\n")
      : "Hàng đợi đang trống.";
  return { nowPlaying, upcomingText };
};

const pauseQueue = (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  const paused = queue.player.pause();
  if (!paused) throw new UserFriendlyError("Không thể tạm dừng bài đang phát.");
  return queue;
};

const resumeQueue = (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  const resumed = queue.player.unpause();
  if (!resumed) throw new UserFriendlyError("Không thể tiếp tục phát nhạc.");
  return queue;
};

const skipQueue = async (client, guildId) => {
  const queue = getQueue(client, guildId);
  if (!queue) throw new UserFriendlyError("Hiện không có hàng đợi nhạc nào.");
  queue.player.stop(true);
  return queue;
};

module.exports = {
  addSongToQueue,
  destroyQueue,
  ensureQueue,
  formatQueue,
  getQueue,
  pauseQueue,
  playNext,
  resolveSong,
  replayCurrentSong,
  replayQueue,
  resumeQueue,
  skipQueue,
  shuffleQueue,
};
