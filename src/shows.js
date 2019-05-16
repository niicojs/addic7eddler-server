// @ts-check
const fs = require('fs');
const path = require('path');

const isVideo = file => {
  const videos = ['.mkv', '.avi', '.mp4'];
  const ext = path.parse(file).ext.toLowerCase();
  return videos.includes(ext);
};

const hasSubtitle = (file, all) => {
  const base = path.basename(file, path.extname(file));
  return !!all.find(f => f.startsWith(base) && f.endsWith('.srt'));
};

const parseEpisode = file => {
  let regex = /(?<name>.+?)(\.(?<year>\d{4}))?\.S(?<season>\d+)E(?<episode>\d+)(\-E(?<multi>\d+))?\.(?<quality>.+)\.(?<codec>.+)\-(?<group>.+)\.(?<ext>.+)/gi;
  let m = regex.exec(file);
  if (!m) {
    // try to parse without codec
    let regex = /(?<name>.+?)(\.(?<year>\d{4}))?\.S(?<season>\d+)E(?<episode>\d+)(\-E(?<multi>\d+))?\.(?<quality>.+)\-(?<group>.+)\.(?<ext>.+)/;
    m = regex.exec(file);
  }
  if (!m) return undefined;
  const info = m.groups;
  info.group = info.group.replace(/\[.+\]$/, '');
  info.group = info.group.toUpperCase();
  if (info.group === 'SVA') info.group = 'AVS';
  return info;
};

class Shows {
  static async handleShow(show) {
    let missing = [];
    const folders = await fs.promises.readdir(show.path);
    for (const sub of folders) {
      const full = path.join(show.path, sub);
      const stats = await fs.promises.lstat(full);
      if (stats.isDirectory()) {
        const match = /^Season (?<season>\d+)/.exec(sub);
        if (match) {
          const others = await this.handleSeason(show, {
            season: match.groups.season,
            path: full
          });
          missing = missing.concat(others);
        } else {
          console.log('Not a season: ' + sub);
        }
      }
    }
    return missing;
  }

  static async handleSeason(show, season) {
    const missing = [];
    const files = await fs.promises.readdir(season.path);
    for (const file of files) {
      const full = path.join(season.path, file);
      const stats = await fs.promises.lstat(full);
      if (!stats.isDirectory() && isVideo(file)) {
        if (!hasSubtitle(file, files)) {
          missing.push({
            name: file,
            path: full,
            show: show.name,
            parsed: parseEpisode(file),
            modified: stats.mtime
          });
        }
      }
    }
    return missing;
  }

  static async getMissing(folder) {
    let missing = [];
    const folders = await fs.promises.readdir(folder);
    for (const sub of folders) {
      const full = path.join(folder, sub);
      const stats = await fs.promises.lstat(full);
      if (stats.isDirectory()) {
        // supposed it's a show, containing season folders
        const others = await this.handleShow({
          name: sub,
          path: full
        });
        missing = missing.concat(others);
      }
    }
    return missing;
  }
}

module.exports = Shows;
