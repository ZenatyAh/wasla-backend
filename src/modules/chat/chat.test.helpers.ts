import type { RequestListener } from "http";
import type { Server } from "http";
import { createServer } from "http";
import type { AddressInfo } from "node:net";

export const startSocketTestServer = async (
  app: RequestListener,
  initSocket: (server: Server) => unknown,
) => {
  const server = createServer(app);
  initSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
};

export const waitForSocketEvent = <T>(
  socket: { once: (event: string, handler: (payload: T) => void) => void },
  event: string,
  timeoutMs = 5000,
) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for socket event: ${event}`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
