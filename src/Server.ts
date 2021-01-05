import restify = require("restify");
import Log from "./Util";

import jwtConfig from "../config.json"
import jwt = require('jsonwebtoken');
import restJWT = require('restify-jwt-community');
import { S3ImageData } from "./ImageProcessor/IImageHandler";
import ImageHandler from "./ImageProcessor/ImageHandler";


/*
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
    private imageHandler: ImageHandler;
    private usernameSet: Set<string> = new Set();

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
        this.imageHandler = new ImageHandler();
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");
                // populate Set with ids from database if this was not just being mocked
                that.rest = restify.createServer({
                    name: "ImageRepo",
                });
                // default maxSize is 10mb
                that.rest.use(restify.plugins.bodyParser());
                that.rest.use(restJWT(jwtConfig.jwt).unless({
                    path: ['/login', '/test']
                }));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });
                // Test endpoint
                // http://localhost:1234/test
                that.rest.get("/test", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    console.log("HEE");
                    res.send(200);
                    return next();
                });

                that.rest.get("/images", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.getUserImages(req, res, next, that.imageHandler);
                })

                that.rest.get("/images/:tag", (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.getUserImagesByTag(req, res, next, that.imageHandler);
                })

                // the bearer token returned from this endpoint must be used in Authorization header for all other endpoints
                // valid for 10 minutes
                that.rest.post("/login" , (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.authenticate(req, res, next, that.usernameSet);
                });

                that.rest.post("/image",
                    (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.uploadImage(req, res, next, that.imageHandler);
                });

                that.rest.post("/imageTags",
                    (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    Server.fetchTags(req, res, next, that.imageHandler);
            });

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


    // if I were to implement this pratically, function would make the call to some 
    // database, retrieve credentials, check if valid etc...
    // The JWT needs to be stored inside an httpOnly cookie should not be accessible
    //  from JavaScript running in the browser, will look into encryption as well.
    // https://blog.logrocket.com/jwt-authentication-best-practices/
    private static authenticate(req: restify.Request, res: restify.Response, next: restify.Next, usernameSet: Set<String>) {
        const { username, admin } = req.body;
        if (username === null || username === undefined || username.length > 15 || usernameSet.has(username)) {
            res.json(400, "Username entered invalid or already used");
        } else {
            // using Date.now()
            // inspired by: https://stackoverflow.com/questions/8012002/create-a-unique-number-with-javascript-time
            const uniqueID = Date.now();
            const data = { userID: uniqueID, name: username, admin: admin }
            const token: any = jwt.sign(data, jwtConfig.jwt.secret, {
                expiresIn: "60m"
            });
            usernameSet.add(username);
            Log.info(`Server::authenticate - Authenticated user: ${username} for 60 minutes`);
            res.json(200, { authToken: token });
    }
        return next();
    }

    private static fetchTags(req: restify.Request, res: restify.Response, next: restify.Next, imageHandler: ImageHandler) {
        const errorJSON = Server.dataValidation(req);
        if (errorJSON.code !== null) {
            res.json(errorJSON.code, {error: errorJSON.error});
            return next();
        } else {
            return imageHandler.fetchTags(req.files.image.path).then((tags: string[]) => {
                res.json(200, {imageID: tags});
                return next();
            }).catch((err: any) => {
                Log.trace(err);
                res.json(400, {err: err});
                return next();
            })
        }
    }
    
    // A lot of these checks should be done at the UI level, but reinforcing here in case it isn't.
    private static dataValidation(req: restify.Request): any {
        const errorJSON: any = {
            code: null,
            error: null
        };
        if (req.getContentLength() > 15000000) {
            errorJSON.code = 400;
            errorJSON.error = "File size greater than 15mb";
        } else if (!req.is("multipart/form-data")) {
            errorJSON.code = 400;
            errorJSON.error = "Content-Type must be multipart/form-data";
        } else if (req.files === undefined || req.files.image === undefined) {
            errorJSON.code = 400;
            errorJSON.error = "Image not found in form data";
        } else if (req.body.tags !== undefined && req.body.tags.split(',').length > 3) {
            errorJSON.code = 400;
            errorJSON.error = "Maximum of 3 tags allowed per picture"
        } else {
            const image = req.files.image;
            if (!image.type.startsWith("image/")) {
                errorJSON.code = 400;
                errorJSON.error = "Only images are supported";
            }
        }
        return errorJSON;
    }

    private static getUserImagesByTag(req: restify.Request, res: restify.Response, next: restify.Next, imageHandler: ImageHandler) {
        // Do type checks, multiform validation before sending of to ImageHandler.
        // when function returns res.send(uuid) of picID,
        const token: string = req.header('Authorization').split(' ')[1];
        const userInfo: any = jwt.decode(token);
        const userID: any = userInfo.userID;
        Log.info(`Server::Fetching Images from user by specific tag:`);
        Log.trace(userInfo);
        Log.trace(req.params)
        return imageHandler.getImagesByTag(userID, req.params.tag).then((data: S3ImageData[]) => {
            res.json(200, data);
            return next();
        }).catch((err: any) => {
            Log.trace(err);
            res.json(400, {err: err});
            return next();
        });
    }
    
    private static getUserImages(req: restify.Request, res: restify.Response, next: restify.Next, imageHandler: ImageHandler) {
        // Do type checks, multiform validation before sending of to ImageHandler.
        // when function returns res.send(uuid) of picID,
        const token: string = req.header('Authorization').split(' ')[1];
        const userInfo: any = jwt.decode(token);
        const userID: any = userInfo.userID;
        Log.info(`Server::Fetching Images from user:`);
        Log.trace(userInfo);

        return imageHandler.getImagesByUserId(userID).then((data: S3ImageData[]) => {
            res.json(200, data);
            Log.trace("DONETDFd")
            return next();
        }).catch((err: any) => {
            Log.trace(err);
            res.json(400, {err: err});
            return next();
        });
    }

    private static uploadImage(req: restify.Request, res: restify.Response, next: restify.Next, imageHandler: ImageHandler) {
        // Do type checks, multiform validation before sending of to ImageHandler.
        // when function returns res.send(uuid) of picID,
        if (req.body.tags === undefined || req.body.tags.split(',') < 3 ||  req.body.tags.split(',') > 3) {
            res.json(400, {error: "Please make sure you have entered 3 tags that describe the picture."});
            return next();
        }
        const errorJSON = Server.dataValidation(req);
        if (errorJSON.code !== null) {
            res.json(errorJSON.code, {error: errorJSON.error});
            return next();
        } else {
            // found from https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript. handles edge cases well
            let fileExt: string = req.files.image.type;
            fileExt = "." + fileExt.substring(fileExt.lastIndexOf('/')+1, fileExt.length) || fileExt;
            const token: string = req.header('Authorization').split(' ')[1];
            const userInfo: any = jwt.decode(token);
            const userID: any = userInfo.userID;
            const tags = req.body.tags.split(',');
            Log.info(`Server::Upload Image Request from user:`);
            Log.trace(userInfo);

            return imageHandler.addImage(userID, req.files.image.path, fileExt, tags).then((uuid: string) => {
                res.json(200, {imageID: uuid});
                return next();
            }).catch((err: any) => {
                Log.trace(err);
                res.json(400, {err: err});
                return next();
            })
        }
    }
}
