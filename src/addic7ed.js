// @ts-check
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { addMonths, isAfter } = require('date-fns');
const nm = require('nanomatch');
const rp = require('request-promise-native');
const request = rp.defaults({
  jar: rp.jar(),
  headers: {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr,en-US;q=0.9,en;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.45 Safari/537.36'
  },
  gzip: true
});

const versionMapping = {
  '720pHDTVAVS': 'AVS',
  SVA: 'AVS',
  '*AVS-SVA*': 'AVS',
  'HDTV.AVS': 'AVS',
  'HDTV.SVA': 'SVA',
  'HDTV.KILLERS': 'KILLERS',
  'SVA-720p.AVS-HBO.WEBRip.*': 'AVS',
  'WEB-DL': 'WEBDL',
  'WEB-TBS': 'TBS',
  DIMENSION: 'LOL'
};

class Addic7ed {
  constructor(config) {
    this.epcache = {};
    this.config = config;
    const lang = config.language || 'fr';
    if (lang === 'en') {
      this.lang = 1;
    } else if (lang === 'fr') {
      this.lang = 8;
    }
  }

  async getShows() {
    const url = 'http://www.addic7ed.com';
    const html = await request.get(url);
    if (this.config.debug) {
      await fs.promises.writeFile('shows.html', html, 'utf8');
    }
    const $ = cheerio.load(html);
    const shows = $('select[name=qsShow]')
      .find('option')
      .toArray()
      .map(elt => ({
        name: $(elt).text(),
        id: $(elt).attr('value'),
        url: 'http://www.addic7ed.com/show/' + $(elt).attr('value')
      }))
      .filter(elt => +elt.id !== 0);

    for (const show of shows) {
      if (show.name.startsWith('NCIS:')) {
        show.name = show.name.replace(/^NCIS\:/, 'NCIS -');
      }
    }

    this.shows = shows;
    return shows;
  }

  findShow(video) {
    let find = video.show.toLowerCase();
    let found = this.shows.find(s => s.name.toLowerCase() === find);
    if (!found) {
      find = find.replace(/\s\(\d+\)$/, '');
      found = this.shows.find(s => s.name.toLowerCase() === find);
      if (!found && video.parsed) {
        find = video.parsed.name.toLowerCase().replace('.', ' ');
        found = this.shows.find(s => s.name.toLowerCase() === find);
        if (!found && video.parsed.year) {
          find = `${find} (${video.parsed.year.toLowerCase()})`;
          found = this.shows.find(s => s.name.toLowerCase() === find);
        }
      }
    }
    return found;
  }

  async findEpisodes(show, season) {
    let episodes = this.epcache[`${show.id}-${season}`];
    if (!episodes) {
      await request.get(show.url);
      const seasonurl =
        `https://www.addic7ed.com/ajax_loadShow.php` +
        `?show=${show.id}&season=${+season}&langs=|${this.lang}|&hd=0&hi=0`;

      const html = await request.get(seasonurl);
      const $ = cheerio.load(html);
      episodes = $('#season .completed')
        .toArray()
        .map(elt => ({
          season: +$(elt)
            .find('td')
            .eq(0)
            .text(),
          episode: +$(elt)
            .find('td')
            .eq(1)
            .text(),
          lang: $(elt)
            .find('td')
            .eq(3)
            .text(),
          version: $(elt)
            .find('td')
            .eq(4)
            .text(),
          completed:
            $(elt)
              .find('td')
              .eq(5)
              .text() === 'Completed',
          hi:
            $(elt)
              .find('td')
              .eq(6)
              .text() === '✔',
          url:
            'http://www.addic7ed.com' +
            $(elt)
              .find('td')
              .eq(9)
              .find('a')
              .attr('href')
        }))
        .filter(ep => ep.completed);

      if (episodes.length === 0 && this.config.debug === 'true') {
        const logfile = path.join(
          this.config.path,
          `${show.name}-S${show.season}.log.json`
        );
        await fs.promises.writeFile(logfile, html, 'utf8');
      }

      for (const ep of episodes) {
        ep.version = ep.version.replace(/web\-dl/i, 'WEBDL');
        // split by &, /, _ or -
        ep.versions = ep.version.toUpperCase().split(/(\s*\&\s*)|\/|\-|_/);
        for (let i = 0; i < ep.versions.length; i++) {
          if (ep.versions[i]) {
            for (const map in versionMapping) {
              if (nm.isMatch(ep.versions[i], map, {})) {
                ep.versions[i] = versionMapping[map];
                break;
              }
            }
          }
        }
      }

      this.epcache[`${show.id}-${season}`] = episodes;
    }
    return episodes;
  }

  async findMatchingEpisode(video, show) {
    let done = 0;
    const twoMonthsAgo = addMonths(Date.now(), -2);
    if (isAfter(video.modified, twoMonthsAgo)) {
      const info = video.parsed;
      if (info) {
        const episodes = await this.findEpisodes(show, info.season);
        const thisone = episodes.filter(ep => +ep.episode === +info.episode);
        let match = thisone.filter(ep => ep.versions.includes(info.group) && !ep.hi);
        if (match.length === 0) {
          // try hearing impaired (hi) if not hi found
          match = thisone.filter(ep => ep.versions.includes(info.group));
        }
        if (match.length > 0) {
          console.log(`  -> found`);
          if (await this.download(show, match[0], video)) {
            done = 1;
          }
        } else if (match.length === 0) {
          console.log(`  -> not yet`);
          // if (this.config.debug === 'true') {
          //   const data = {
          //     info,
          //     thisone,
          //     match
          //   };
          //   const logfile = path.join(
          //     this.config.path,
          //     `${info.name}-S${info.season}E${info.episode}.match.log.json`
          //   );
          //   await fs.promises.writeFile(logfile, JSON.stringify(data), 'utf8');
          // }
        } else {
          console.log(`  -> not a exact match, get all? (maybe later)`);
        }
      } else {
        console.log(`  -> unable to parse episode`);
      }
    } else {
      console.log(`  -> video is too old, give up`);
    }
    return done;
  }

  async download(show, episode, video, rename = true) {
    const data = await request.get(episode.url, {
      resolveWithFullResponse: true,
      headers: {
        Referer: `${show.url}/${episode.season}`
      },
      encoding: null
    });

    const folder = path.dirname(video.path);

    if (data.body.includes('Addic7ed.com - Sorry, download limit exceeded')) {
      await fs.promises.writeFile(
        path.join(folder, 'log.json'),
        JSON.stringify(data.headers)
      );
      return false;
    } else if (rename) {
      const file = path.basename(video.path, path.extname(video.path));
      await fs.promises.writeFile(path.join(folder, file + '.srt'), data.body);
    } else {
      let filename = data.headers['content-disposition'];
      if (filename) {
        filename = filename
          .replace('attachment; filename=', '')
          .replace(/(:|"|\t)/g, '');
        await fs.promises.writeFile(path.join(folder, filename), data.body);
      }
    }

    return true;
  }
}

module.exports = Addic7ed;
