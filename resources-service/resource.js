const { Client } = require('pg');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const {
  REDIS_NAME,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB_NAME,
} = process.env;

const redisClient = redis.createClient({
  // url?: string; TODO: is this needed?
  name: REDIS_NAME,
});

redisClient.on('connect', () => {
  console.log('Connected!');
});

const dbclient = new Client({
  resource: POSTGRES_USER,
  database: POSTGRES_DB_NAME,
  password: POSTGRES_PASSWORD,
  port: Number(POSTGRES_PORT),
  host: POSTGRES_HOST,
});

const dbcall = async (query) => {
  await dbclient.connect();
  const res = await dbclient.query(query);
  await dbclient.end();
  return res;
};

class Resource {
  constructor(resourceJSON) {
    this.id = resourceJSON.id || '';
    this.aclstr = resourceJSON.aclstr || '';
    this.aclnum = resourceJSON.aclnum || '';
    this.createdDate = resourceJSON.createdDate || '';
    this.updatedDate = resourceJSON.updatedDate || '';
    this.deletedDate = resourceJSON.deletedDate || '';
    this.body = resourceJSON.body || '';
  }
}

exports.Resource = Resource;

exports.ResourceFunctions = {
  getResource: async (id) => {
    let finalRes = '{}';
    const rget = redisClient.get(id);
    if (rget) {
      finalRes = rget;
    } else {
      const query = {
        name: 'fetch-resource',
        text: 'SELECT * FROM Resources WHERE id = $1',
        values: [id],
      };
      const res = await dbcall(query);
      finalRes = res.rows[0].message;
      redisClient.set(id, finalRes);
      redisClient.expire(id, 60 * 60);
    }
    const resJSON = JSON.parse(finalRes);
    return new Resource(resJSON);
  },

  makeResource: async (args) => {
    const {
      aclstr,
      aclnum,
      body,
    } = args;
    const nowString = Date.now().toString();
    const newResource = {
      id: uuidv4(),
      createdDate: nowString,
      updatedDate: nowString,
      aclstr,
      aclnum,
      body,
    };
    const query = {
      name: 'make-resource',
      text: 'INSERT INTO Resources (id, createdDate, updatedDate, aclstr, aclnum, body)',
      values: [newResource.id,
        newResource.createdDate,
        newResource.updatedDate,
        newResource.aclstr,
        newResource.aclnum,
        newResource.body],
    };
    await dbcall(query);
    return true;
  },
};
