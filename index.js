// @ts-check

const fs = require('fs');
const path = require('path');

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

  if (videos.length > 0) {
    const addic7ed = new Addic7ed('fr');
    await addic7ed.getShows();
    // await fs.promises.writeFile('dev-shows.json', JSON.stringify(available), 'utf8');

    for (const video of videos) {
      console.log(`Finding subtitle for ${video.name}`);
      const found = addic7ed.findShow(video);
      if (found) {
        await addic7ed.findMatchingEpisode(video, found);
      } else {
        console.log(` --> TV Show not found`);
      }
    }
  }

  console.log('Done.');
})();
