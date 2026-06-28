class ServerData {
  constructor() {
    this.guilds = new Map();
    this.setups = new Map();
    this.stays = new Map();
    this.djs = new Map();
    this.roles = new Map();
    this.playlists = new Map(); 
  }
  async get(guildId) {
    if (!this.guilds.has(guildId)) {
      return this.createGuild(guildId);
    }
    return this.guilds.get(guildId);
  }
  async createGuild(guildId) {
    const guild = {
      guildId,
      prefix: process.env.PREFIX ?? "u",
      language: process.env.DEFAULT_LANGUAGE ?? "en",
    };
    this.guilds.set(guildId, guild);
    return guild;
  }
  async setPrefix(guildId, prefix) {
    const g = await this.get(guildId);
    g.prefix = prefix;
    this.guilds.set(guildId, g);
  }
  async getPrefix(guildId) {
    const g = await this.get(guildId);
    return g?.prefix ?? process.env.PREFIX ?? "u";
  }
  async updateLanguage(guildId, language) {
    const g = await this.get(guildId);
    g.language = language;
    this.guilds.set(guildId, g);
  }
  async getLanguage(guildId) {
    const g = await this.get(guildId);
    return g?.language ?? process.env.DEFAULT_LANGUAGE ?? "en";
  }
  async getSetup(guildId) {
    return this.setups.get(guildId) ?? null;
  }
  async setSetup(guildId, textId, messageId) {
    this.setups.set(guildId, { guildId, textId, messageId });
  }
  async deleteSetup(guildId) {
    this.setups.delete(guildId);
  }
  async set_247(guildId, textId, voiceId) {
    this.stays.set(guildId, { guildId, textId, voiceId });
  }
  async delete_247(guildId) {
    this.stays.delete(guildId);
  }
  async get_247(guildId) {
    if (guildId) return this.stays.get(guildId) ?? null;
    return Array.from(this.stays.values());
  }
  async setDj(guildId, mode) {
    this.djs.set(guildId, { guildId, mode });
  }
  async getDj(guildId) {
    return this.djs.get(guildId) ?? null;
  }
  async getRoles(guildId) {
    return this.roles.get(guildId) ?? [];
  }
  async addRole(guildId, roleId) {
    const arr = this.roles.get(guildId) || [];
    arr.push({ guildId, roleId });
    this.roles.set(guildId, arr);
  }
  async removeRole(guildId, roleId) {
    const arr = (this.roles.get(guildId) || []).filter(
      (r) => r.roleId !== roleId,
    );
    this.roles.set(guildId, arr);
  }
  async clearRoles(guildId) {
    this.roles.delete(guildId);
  }
  async getPlaylist(userId, name) {
    return this.playlists.get(`${userId}:${name}`) ?? null;
  }
  async getUserPlaylists(userId) {
    const res = [];
    for (const [key, val] of this.playlists.entries()) {
      if (key.startsWith(`${userId}:`)) res.push(val);
    }
    return res;
  }
  async createPlaylist(userId, name) {
    this.playlists.set(`${userId}:${name}`, {
      userId,
      name,
      tracks: JSON.stringify([]),
    });
  }
  async createPlaylistWithTracks(userId, name, tracks) {
    this.playlists.set(`${userId}:${name}`, {
      userId,
      name,
      tracks: JSON.stringify(tracks),
    });
  }
  async deletePlaylist(userId, name) {
    this.playlists.delete(`${userId}:${name}`);
  }
  async deleteSongsFromPlaylist(userId, playlistName) {
    const key = `${userId}:${playlistName}`;
    const p = this.playlists.get(key);
    if (p) p.tracks = JSON.stringify([]);
    this.playlists.set(key, p);
  }
  async addTracksToPlaylist(userId, playlistName, tracks) {
    const key = `${userId}:${playlistName}`;
    const p = this.playlists.get(key);
    if (p) {
      const existing = p.tracks ? JSON.parse(p.tracks) : [];
      p.tracks = JSON.stringify([...existing, ...tracks]);
      this.playlists.set(key, p);
    } else {
      await this.createPlaylistWithTracks(userId, playlistName, tracks);
    }
  }
  async removeSong(userId, playlistName, encodedSong) {
    const key = `${userId}:${playlistName}`;
    const p = this.playlists.get(key);
    if (!p) return;
    const arr = JSON.parse(p.tracks || "[]");
    const idx = arr.indexOf(encodedSong);
    if (idx !== -1) {
      arr.splice(idx, 1);
      p.tracks = JSON.stringify(arr);
      this.playlists.set(key, p);
    }
  }
  async getTracksFromPlaylist(userId, playlistName) {
    const key = `${userId}:${playlistName}`;
    const p = this.playlists.get(key);
    if (!p) return null;
    return JSON.parse(p.tracks || "[]");
  }
}

module.exports = ServerData;
