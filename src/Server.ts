import fs = require("fs-extra");
import restify = require("restify");
import Log from "./Util";
import jwtConfig from "../config.json"
import jwt = require('jsonwebtoken');
import restJWT = require('restify-jwt-community');


/**
 * This configures the REST endpoints for the server.
 * Use POST to login, returns JWT token that has user metadata 
 *        (fetches from db theoretically, using dummy data for now) -> Not implemented 
 * 
 * https://medium.com/sean3z/json-web-tokens-jwt-with-restify-bfe5c4907e3c
 * Use GET for search, pass JWT token -> will return the URLs from S3
 * Use GET[id] get specific pic
 * Use PUT to upload pics, pass JWT token -> get userID from JWT and generate tags using ML API return picID
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
                that.rest.use(restify.plugins.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(restify.plugins.queryParser());
                that.rest.use(restJWT(jwtConfig.jwt).unless({
                    path: ['/login', '/echo/:msg']
                }))
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });
                // Test endpoint
                // http://localhost:1234/echo/hello
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.get("/test", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    console.log("HEE");
                    res.send(200);
                    return next();
                });

                // the bearer token returned from this endpoint must be used in Authorization header for all other endpoints
                // valid for 10minutes
                that.rest.post("/login" , (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.authenticate(req, res, next);
                })

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

    // if I were to implement this, function would make the call to some db store retrieve credentials, check if valid etc...
    // simulating uniqueIDs by incrementin
    private static authenticate(req: restify.Request, res: restify.Response, next: restify.Next) {
        // normally req.body would have username + password but since I am mocking db validation
        // checking if username already exists + password is not relevant
        const { username, admin } = req.body;
        if (username === null || username === undefined || username.length > 15) {
            res.json(400, "Username entered invalid")
        }
        
        // using Date.now() for unique IDs, this may need to change if this is implemented on a
        // that runs a multithreaded system with several thousand operations in the ssame millisecond.
        // inspired by: https://stackoverflow.com/questions/8012002/create-a-unique-number-with-javascript-time
        const uniqueID = Date.now() + Math.floor(Math.random() * 100);
        const data = { userID: uniqueID, name: username, admin: admin }
        const token: any = jwt.sign(data, jwtConfig.jwt.secret, {
            expiresIn: "10m"
        });
        res.json(200, { authToken: token });
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }
}
