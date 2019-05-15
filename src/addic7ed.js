// @ts-check
const fs = require('fs');
const cheerio = require('cheerio');
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

class Addic7ed {
  constructor(lang) {
    this.epcache = {};
    if (lang === 'en') {
      this.lang = 1;
    } else if (lang === 'fr') {
      this.lang = 8;
    }
  }

  async getShows() {
    const cached = JSON.parse(
      await fs.promises.readFile('dev-shows.json', 'utf8')
    );
    this.shows = cached;
    return cached;
    const url = 'http://www.addic7ed.com';
    const html = await request.get(url);
    // await fs.writeFile('shows.html', html, 'utf8');
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
        `?show=${show.id}&season=${+season}&langs=|${this.lang}|&hd=0&hi=-1`;

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
          url:
            'http://www.addic7ed.com' +
            $(elt)
              .find('td')
              .eq(9)
              .find('a')
              .attr('href')
        }))
        .filter(ep => ep.completed);

      for (const ep of episodes) {

      }

      this.epcache[`${show.id}-${season}`] = episodes;
    }
    return episodes;
  }

  async findMatchingEpisode(video, show) {
    const info = video.parsed;
    const episodes = await this.findEpisodes(show, info.season);
    const thisone = episodes.filter(ep => +ep.episode === +info.episode);
    const match = thisone.filter(ep => ep.version === info.group);
    if (match.length > 0) {
      console.log(`exact match`);
      console.log(match);
    } else {
      console.log(`not a exact match`);
      console.log(thisone);
    }
    ''.toString();
  }
}

module.exports = Addic7ed;
