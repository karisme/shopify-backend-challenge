/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs-extra");
import restify = require("restify");
import Log from "./Util";

/**
 * This configures the REST endpoints for the server.
 * Use POST to create new user
 * Use POST to login, returns Oath key
 * Use GET for search
 * Use PUT to upload pics
 */
export default class Server {

    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value.
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");
                that.rest = restify.createServer({
                    name: "ImageRepo",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });
                // Test endpoint
                // http://localhost:1234/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // that.rest.put("/dataset/:id/:kind",
                //     (req: restify.Request, res: restify.Response, next: restify.Next) => {
                //     Server.addDataset(that.insightFacade, req, res, next);
                // });

                // that.rest.get("/datasets", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                //     Server.listDataset(that.insightFacade, res, next);
                // });

                // that.rest.post("/query", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                //     Server.performQuery(that.insightFacade, req, res, next);
                // });

                // that.rest.del("/dataset/:id", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                //   //  Server.removeDataset(that.insightFacade, req, res, next);
                // });
                // // This must be the last endpoint!
                // that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    // private static addDataset(insightFacade: InsightFacade, req: restify.Request,
    //                           res: restify.Response, next: restify.Next) {
    //     Log.trace("Server::PUT dataset");
    //     const datasetBase64 = req.body.toString("base64");
    //     insightFacade.addDataset(req.params.id, datasetBase64, req.params.kind).then((datasets: string[]) => {
    //         res.json(200, { result: datasets });
    //         return next();
    //     }).catch((err) => {
    //         res.json(400, { error: err.message });
    //         return next();
    //     });
    // }

    // private static performQuery(insightFacade: InsightFacade, req: restify.Request,
    //                             res: restify.Response, next: restify.Next) {
    //     Log.trace("Server::POST query");
    //     insightFacade.performQuery(req.body).then((queryResult: any[]) => {
    //         res.json(200, { result: queryResult });
    //         return next();
    //     }).catch((err) => {
    //         res.json(400, { error: err.message });
    //         return next();
    //     });
    // }

    // private static listDataset(insightFacade: InsightFacade, res: restify.Response, next: restify.Next) {
    //     Log.trace("Server::GET datasets");
    //     insightFacade.listDatasets().then((datasets: InsightDataset[]) => {
    //         res.json(200, { result: datasets });
    //         return next();
    //     });
    // }

}
