// @ts-check

const fs = require('fs');
const path = require('path');
const request = require('request-promise-native');

const Addic7ed = require('./src/addic7ed');
const Shows = require('./src/shows');

const folders = {
  config: '/config'
};
let config = {
  media: '.',
  language: 'fr'
};

(async () => {
  if (!fs.existsSync(folders.config)) folders.config = '.';

  const configpath = path.join(folders.config, 'config.json');
  const json = await fs.promises.readFile(configpath, 'utf8');
  config = JSON.parse(json);

  const videos = await Shows.getMissing(config.media);
  console.log(`${videos.length} videos without subtitles`);
  // await fs.promises.writeFile('dev-videos.json', JSON.stringify(videos), 'utf8');

  const downloaded = [];
  if (videos.length > 0) {
    const addic7ed = new Addic7ed(config.language);
    await addic7ed.getShows();
    // await fs.promises.writeFile('dev-shows.json', JSON.stringify(available), 'utf8');

    for (const video of videos) {
      console.log(`Finding subtitle for ${video.name}`);
      const found = addic7ed.findShow(video);
      if (found) {
        if (await addic7ed.findMatchingEpisode(video, found)) {
          if (video.parsed) {
            const info = video.parsed;
            downloaded.push(`${info.name} S${info.season}E${info.episode}`);
          } else {
            downloaded.push(video.parsedvideo.name);
          }
        }
      } else {
        console.log(` --> TV Show not found`);
      }
    }
  }

  const nb = downloaded.length;
  console.log(`${nb} file${nb > 1 ? 's' : ''} downloaded.`);
  if (nb > 0 && config.notifications.pushbullet) {
    console.log('Sending notification');
    try {
      await request.post({
        url: 'https://api.pushbullet.com/v2/pushes',
        headers: {
          'Access-Token': config.notifications.pushbullet
        },
        json: true,
        body: {
          type: 'note',
          title: 'Addic7edler',
          body: `${nb} file(s) downloaded.\n` + downloaded.join('\n')
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  console.log('Done.');
})();
