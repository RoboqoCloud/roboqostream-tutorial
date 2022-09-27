const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const {
  ROBOQO_OAUTH_URL,
  ROBOQO_CLIENT_ID,
  ROBOQO_CLIENT_SECRET,
  ROBOQO_AUDIENCE,
  STREAMAPI_ENDPOINT,
} = process.env;

const PROTO_PATH = __dirname + "/proto/roboqostream.proto";

let packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const roboqostream = grpc.loadPackageDefinition(packageDefinition).roboqostream;

async function getAccessToken() {
  const {
    data: { access_token },
  } = await axios.post(ROBOQO_OAUTH_URL, {
    client_id: ROBOQO_CLIENT_ID,
    client_secret: ROBOQO_CLIENT_SECRET,
    audience: ROBOQO_AUDIENCE,
    grant_type: "client_credentials",
  });

  return access_token;
}

async function main() {
  const access_token = await getAccessToken();

  const client = new roboqostream.RoboqoStream(
    STREAMAPI_ENDPOINT,
    grpc.credentials.createInsecure(),
    {
      "grpc.max_receive_message_length": 1024 * 1024 * 100,
    }
  );

  const subscribeMessage = {
    access_token,
    owners: [],
    mentions: [],
    slot_updates: true,
  };

  function connect() {
    const subscription = client.subscribe(subscribeMessage);

    subscription.on("data", (message) => {
      console.log(message);
    });

    subscription.on("end", () => connect());
    subscription.on("error", (error) => {
      console.error(error);
      connect();
    });
  }

  connect();
}

main();
