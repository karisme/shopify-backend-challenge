import Server from "./Server";
import Log from "./Util";

/**
 * Main app class that is run with the node command. Starts the server.
 */
export class App {
    public initServer(port: number) {
        Log.info("App::Initializing server on port: ( " + port + " ) - start");
        const server = new Server(port);
        server.start().then(function (val: boolean) {
            Log.info("App::Server boot status -> " + val);
        }).catch(function (err: Error) {
            Log.error("App::Server boot ERROR: " + err.message);
        });
    }
}

// This starts App and listens on a hardcoded port (1234)
Log.info("App - starting");
const app = new App();
app.initServer(1234);
