import screenshot from "screenshot-desktop";
import { WebSocketServer } from "ws";
import http from "http";
import getPixels from "get-pixels";
import fs from "fs";
import path from "path";
import robot from "robotjs";
import os from "os";

interface Location {
  x: number;
  y: number;
  type: string;
}

interface ScreenSize {
  width: number;
  height: number;
  src: string;
}

const createScreenshot = async () => {
  const image = await screenshot({ format: "png" });
  return {
    base64: image.toString("base64"),
    imageBuffer: image,
  };
};

const server = http.createServer();
const wss = new WebSocketServer({ server });

const getScreenSize = async () => {
  const { imageBuffer, base64 } = await createScreenshot();
  const filePath = path.join(process.cwd(), "/screenshot.png");
  fs.writeFileSync(filePath, imageBuffer);
  return new Promise((resolve, reject) => {
    getPixels(filePath, (err, pixels) => {
      if (err) reject(err);
      resolve({
        width: pixels.shape[0],
        height: pixels.shape[1],
        base64,
      });
    });
  });
};

function getIPAdress() {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName] ?? [];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}

wss.on("connection", async (ws) => {
  ws.on("message", (message: string) => {
    const data: Location = JSON.parse(message);
    if (data.type === "click") {
      const x = data.x;
      const y = data.y;
      robot.moveMouse(x, y);
      robot.mouseClick();
    }
  });
  setInterval(async () => {
    const data = (await getScreenSize()) as ScreenSize;
    ws.send(JSON.stringify(data));
  }, 1000);
});
server.listen(3000, () => {
  let ip = getIPAdress();
  console.log("\n--------IP地址：" + ip + ":3000" + "------\n");
});
