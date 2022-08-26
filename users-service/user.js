const { Client } = require('pg');
const redis = require('redis');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const keyFileContent = require('fs').readFileSync('./jwtRS256.key');
const base64url = require('base64url');
const crypto = require('crypto');

const {
  REDIS_NAME,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB_NAME,
  SALT_ROUNDS,
} = process.env;

const redisClient = redis.createClient({
  // url?: string; TODO: is this needed?
  name: REDIS_NAME,
});

redisClient.on('connect', () => {
  console.log('Connected!');
});

const dbclient = new Client({
  user: POSTGRES_USER,
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

class User {
  constructor(userJSON) {
    this.id = userJSON.id || '';
    this.displayname = userJSON.displayname || '';
    this.groupname = userJSON.groupname || '';
    this.email = userJSON.email || '';
    this.password = userJSON.password || '';
    this.createdDate = userJSON.createdDate || '';
    this.updatedDate = userJSON.updatedDate || '';
    this.deletedDate = userJSON.deletedDate || '';
    this.confirmed = userJSON.confirmed || false;
  }
}
exports.User = User;

exports.UserFunctions = { // TODO: this all needs error handling
  getUser: async (args) => {
    const { id } = args;
    let finalRes = '{}';
    const rget = redisClient.get(id);
    if (rget) {
      finalRes = rget;
    } else {
      const query = {
        name: 'fetch-user',
        text: 'SELECT * FROM Users WHERE id = $1',
        values: [id],
      };
      const res = await dbcall(query);
      finalRes = res.rows[0].message;
      redisClient.set(id, finalRes);
      redisClient.expire(id, 60 * 60);
    }
    const resJSON = JSON.parse(finalRes);
    return new User(resJSON);
  },

  loginUser: async (args) => {
    const { email, password } = args;
    let finalRes = '{}';
    const query = {
      name: 'fetch-user',
      text: 'SELECT * FROM Users WHERE email = $1',
      values: [email],
    };
    const res = await dbcall(query);
    finalRes = res.rows[0].message;

    const resJSON = JSON.parse(finalRes);
    const valid = await bcrypt.compare(password, resJSON.password);

    // If it is not a valid password for the user, return null
    if (valid) {
      const header = {
        typ: 'JWT',
        alg: 'RS256',
      };

      const data = {
        id: resJSON.id,
        displayname: resJSON.displayname,
        groupname: resJSON.groupname,
        email: resJSON.email,
        iat: Math.floor(Date.now() / 1000) + 257,
      };

      // encode header
      const stringifiedHeader = JSON.stringify(header);
      const encodedHeader = base64url(stringifiedHeader);

      // encode data
      const stringifiedData = JSON.stringify(data);
      const encodedData = base64url(stringifiedData);

      // build token
      const token = `${encodedHeader}.${encodedData}`;

      // sign token
      const signatureAlg = crypto.createSign('sha256');
      signatureAlg.update(token);
      let signature = signatureAlg.sign(keyFileContent);
      signature = base64url(signature);
      const signedToken = `${token}.${signature}`;

      return signedToken;
    }

    return '';
  },

  makeRootUser: async (args) => {
    const {
      password, confirmPassword, displayname, email,
    } = args;
    const nowString = Date.now().toString();
    const newUser = {
      id: uuidv4(),
      groupname: 'root',
      createdDate: nowString,
      updatedDate: nowString,
      displayname,
      email,
    };
    if (password === confirmPassword) {
      bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
        if (!err) newUser.password = hash;
      });
    }
    const query = {
      name: 'make-user',
      text: 'INSERT INTO Users (id, groupname, createdDate, updatedDate, displayname, email, password)',
      values: [newUser.id,
        newUser.groupname,
        newUser.createdDate,
        newUser.updatedDate,
        newUser.displayname,
        newUser.email,
        newUser.password],
    };
    await dbcall(query);
    return true;
  },
};
