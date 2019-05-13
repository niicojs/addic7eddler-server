const fs = require('fs');
const path = require('path');
const fastify = require('fastify')();

const folders = {
  config: '/config',
  data: '/data'
};

fastify.get('/', async (request, reply) => {
  return { message: `it's working :)` };
});

fastify.post('/', async (request, reply) => {
  console.log(request.body);
  const event = request.body.eventType;
  const id = request.body.episodeFile.id;
  const file = request.body.episodeFile.path;
  console.log(`${id}: ${file}`);
  await fs.promises.writeFile(
    path.join(folders.data, `${id}.${event}.json`),
    JSON.stringify(request.body),
    'utf8'
  );
  return { message: `ok` };
});

const start = async () => {
  try {
    if (!fs.existsSync(folders.config)) folders.config = '';
    if (!fs.existsSync(folders.data)) folders.data = '';

    await fastify.listen(8080);
    console.log(`Server listening on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
