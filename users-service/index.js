const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const fs = require('fs').promises;
const { UserFunctions } = require('./user');

const { GQL_SCHEMA_SWARM_PORT } = process.env;

const defaultPort = 8080;

async function setup() {
  const schemaSource = await fs.readFile('schema.graphql', 'utf-8');
  const schema = buildSchema(schemaSource);

  const resolver = {
    service: {
      name: 'users-service',
      version: '1.0.0',
      schema: schemaSource,
    },
  };
  Object.entries(UserFunctions).forEach(([key, val]) => {
    resolver[key] = val;
  });

  const app = express();
  app.use(
    '/query',
    graphqlHTTP({
      schema,
      rootValue: resolver,
      graphiql: true,
    }),
  );

  app.use('/health', (req, res) => {
    res.send(`uptime ${process.uptime()}`);
  });

  return app;
}

(async () => {
  try {
    const app = await setup();
    const port = GQL_SCHEMA_SWARM_PORT || defaultPort;
    app.listen(port, () => console.log(`example nodejs-service running on http://localhost:${port}/`));
  } catch (e) {
    console.log(e);
  }
})();
