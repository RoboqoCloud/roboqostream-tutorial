const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const {
  OCTAVE_OAUTH_URL,
  OCTAVE_CLIENT_ID,
  OCTAVE_CLIENT_SECRET,
  OCTAVE_AUDIENCE,
  OCTAVE_STREAM_ENDPOINT,
} = process.env;

const PROTO_PATH = __dirname + "/proto/octavestream.proto";

let packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { octavestream } = grpc.loadPackageDefinition(packageDefinition);

async function getAccessToken() {
  const {
    data: { access_token },
  } = await axios.post(OCTAVE_OAUTH_URL, {
    client_id: OCTAVE_CLIENT_ID,
    client_secret: OCTAVE_CLIENT_SECRET,
    audience: OCTAVE_AUDIENCE,
    grant_type: "client_credentials",
  });

  return access_token;
}

async function main() {
  const access_token = await getAccessToken();

  const client = new octavestream.OctaveStream(
    OCTAVE_STREAM_ENDPOINT,
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
