import { Server } from "socket.io";
import { Redis } from "ioredis";
import { produceMessage } from "./kafka";

const publisher = new Redis({
  host: "",
  port: 10037,
  username: "default",
  password: "",
});
const subscriber = new Redis({
  host: "",
  port: 10037,
  username: "default",
  password: "",
});

class SocketService {
  private _io: Server;

  constructor() {
    console.log("INIT SOCKET SERVICE");
    this._io = new Server({
      cors: {
        allowedHeaders: ["*"],
        origin: "*",
      },
    });
    // subsriber subsribed to MESSAGES channel
    subscriber.subscribe("MESSAGES");
  }

  public initListeners() {
    console.log("INIT SOCKET LISTENERS");
    const io = this.io;
    // accepting the socket connections
    io.on("connect", async (socket) => {
      console.log("NEW SOCKET CONNECTED -> ", socket.id);

      // when new connection emit the "event:message"
      socket.on("event:message", async ({ message }: { message: string }) => {
        console.log("NEW MESSAGE RECEIVED", message);
        // publishing this message to redis
        await publisher.publish("MESSAGES", JSON.stringify({ message }));
      });
    });

    // here subsriber receives all the message
    // When a message arrives on any subscribed channel, this function is triggered.
    // In the context of Redis, the word "message" is the default event name that Redis
    // uses to signify that a message has been received on a subscribed channel.
    // It's a predefined event name within the Redis Pub/Sub system, and this particular
    // event is triggered whenever any message arrives, regardless of the channel.
    subscriber.on("message", async (channel, message) => {
      if (channel === "MESSAGES") {
        console.log("NEW MSG FROM REDIS", message);
        // incoming msg sent to all the socket clients
        io.emit("message", message);
        await produceMessage(message);
        console.log("Message Produced to Kafka Broker");
      }
    });
  }

  get io() {
    return this._io;
  }
}

export default SocketService;
