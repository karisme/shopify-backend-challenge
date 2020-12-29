import { IImageHandler, ImageData } from "./IImageHandler"
import Log from "../Util"
import aws = require('aws-sdk')
import fs = require("fs-extra");
import { v4 as uuidv4} from 'uuid';

export default class ImageHandler implements IImageHandler {
    constructor() {
        Log.info("ImageHandler::Image Handler Initiated")
    }

    public addImage(userID: string, filePath: string, fileExt: string, tags: string[]) : Promise<string> {
        return new Promise((resolve, reject) => {
            const image: Buffer = fs.readFileSync(filePath);
            const picID: string = uuidv4();
            const objectID: string = userID + "/" + picID + fileExt;
            const s3 = new aws.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                apiVersion: '2006-03-01'
            });
            s3.upload({
                Bucket: "backend-challenge-shopify",
                Key: objectID,
                Body: image
            }, (err, data) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(picID);
                }
            })
            // userID:imageID, i want to store it in S3 with that id, and in a way that makes tags be accesible for lookup
            // maybe there is a way in s3 to store userID/picID 
        })
    }

    public searchImages() : Promise<ImageData[]> {
        // get images from user, then check, since 3 its constant, if this was more than a few thousand pictures,
        // would have to look into (learn how to use) elastic search
        return Promise.reject("Not implemented");
    }

    public searchImage(id: string) : Promise<ImageData> {
        return Promise.reject("Not implemented");
    }
}