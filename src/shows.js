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
  const regex = /(?<name>.+?)(\.(?<year>\d{4}))?\.S(?<season>\d+)E(?<episode>\d+)(\-E(?<multi>\d+))?\.(?<quality>.+)\.(?<codec>.+)\-(?<group>.+)\.(?<ext>.+)/gi;
  const m = regex.exec(file);
  return m ? m.groups : undefined;
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
        // we have a video
        if (!hasSubtitle(file, files)) {
          missing.push({
            name: file,
            path: full,
            show: show.name,
            // season: season.season,
            parsed: parseEpisode(file)
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
