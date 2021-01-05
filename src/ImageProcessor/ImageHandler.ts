import { IImageHandler, S3ImageData } from "./IImageHandler"
import Log from "../Util"
import aws = require('aws-sdk')
import fs = require("fs-extra");
import FormData = require('form-data');
import { v4 as uuidv4} from 'uuid';
import { S3 } from "aws-sdk";

const axios = require('axios').default;

export default class ImageHandler implements IImageHandler {
    constructor() {
        Log.info("ImageHandler::Image Handler Initiated")
    }

    public addImage(userID: string, filePath: string, fileExt: string, tags: string[]) : Promise<string> {
        return new Promise((resolve, reject) => {
            const image: fs.ReadStream = fs.createReadStream(filePath);
            const picID: string = uuidv4();
            const objectID: string = userID + "/" + picID + fileExt;
            const tagMetadata = {
                tag_zero: tags[0],
                tag_one: tags[1],
                tag_two: tags[2]
            }
            const s3 = new aws.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                apiVersion: '2006-03-01'
            });
            // using callback here for simplicty
            s3.upload({
                Bucket: "backend-challenge-shopify",
                Key: objectID,
                Body: image,
                Metadata : tagMetadata
            }, (err, data) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(picID);
                }
            })
            // i.w. make tags be accesible for lookup -> put them in metadata constant(3)
            // i.w. to organize it some folder hierachy (userID/picID) -> This turned out to be true
        })
    }


    /**
     * If this was the priority operation, I would look into storing into S3 differently
     * @param userID 
     * @param tag 
     */

    public getImagesByTag(userID: string, tag: string) : Promise<S3ImageData[]> {
        // get images from user, then check, since 3 its constant, if this was more than a few thousand pictures,
        // would have to look into (learn how to use) elastic search
        return new Promise((resolve, reject) => {
            const matchingRecords: S3ImageData[] = [];
            return this.getImagesByUserId(userID).then((data: any[]) => {
                for (let record of data) {
                    if (record.tags.contains(tag)) {
                        matchingRecords.push(record);
                    }
                }
                if (matchingRecords.length > 0) {
                    return resolve(matchingRecords);
                } else {
                    return reject("No images saved under this user, contain the specified tag");
                }
            }).catch((err) => {
                return reject(err);
            })
        })
    }

    public getImagesByUserId(userID: string) : Promise<S3ImageData[]> {
        return new Promise((resolve, reject) => {
            // x-amz-meta-tag_on
            const s3 = new aws.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                apiVersion: '2006-03-01'
            });
            const params: aws.S3.ListObjectsV2Request = {
                Bucket: "backend-challenge-shopify",
                Prefix: userID.toString()
            };
            // Did this using callback because Promise was giving strange type disagreement error
            s3.listObjectsV2(params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                if (data.Contents === undefined || data.Contents.length === 0) return reject("No images associated to this userID");
                const allRecordsPromises: Promise<any>[] = [];
                for (let obj of data.Contents) {
                    // first params will act as an S3.GetObjectRequest, then I add expireKey for URL request
                    const params: any = {
                        Bucket: "backend-challenge-shopify",
                        Key: obj.Key
                    }
                    allRecordsPromises.push(this.fetchRecordInfoPromise(s3, params));
                }
                return Promise.all(allRecordsPromises).then((data: any[]) => {
                    const allFormattedRecords: S3ImageData[] = this.createImageData(data);
                    Log.trace("HEEEE");
                    return resolve(allFormattedRecords);
                }).catch((err: any) => {
                    Log.trace(err)
                    return reject(err);
                });
            });
        });
    }

    /**
     * 
     * @param s3 
     * @param params
     * 
     * This will give me a promise that resovles with an object that has
     * {
     *  data: general data about object (ID, Date, Etc)
     *  URL: unique URL that expires in 5 minutes
     * }
     * 
     * This was necessary because listObject doesnt give me all the information I need,
     * but it gives me enough to fetch the URL. Instead of waiting until I get all the information
     * by calling getObject, I can start to get a signed URL at the same time to be more efficient.
     */

    public fetchRecordInfoPromise(s3: aws.S3, params: any): any {
        return new Promise((resolve, reject) => {
            const promiseArray: any[] = [];
            promiseArray.push(s3.headObject(params).promise());
            params["Expires"] = 60 * 5; // 5 minutes, arbitrary
            promiseArray.push(s3.getSignedUrlPromise('getObject', params))
            return Promise.all(promiseArray).then((recordData: any[]) => {
                const recordInfo = {
                    ID: params.Key,
                    data: recordData[0],
                    URL: recordData[1]
                };
                return resolve(recordInfo);
            }).catch((err) => {
                return reject(err);
            })
        })
    }

    public createImageData(records: any[]): S3ImageData[] {
        const result: S3ImageData[] = [];
        for (let record of records) {
            const formattedRecord: S3ImageData = {
                id: record.ID,
                lastModified: record.data.LastModified,
                tags: Object.values(record.data.Metadata),
                imageURL: record.URL
            }
            result.push(formattedRecord);
        }
        return result;
    }

    // very annoying...., ethics?
    public fetchTags(filePath: string) : Promise<string[]> {
        const url: string = "https://api.everypixel.com/v1/keywords?num_keywords=3";
        const image: fs.ReadStream = fs.createReadStream(filePath);
        const bodyFormData = new FormData()
        bodyFormData.append('data', image); //alternative upload to S3 temporarily
        
        const clientID = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET;
        const config = {
            auth: {
                username: clientID,
                password: clientSecret
            },
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + bodyFormData.getBoundary()
            }
        }
        return new Promise((resolve, reject) => {
            return axios.post(url, bodyFormData, config).then((response: any) => {
                resolve(response.data.keywords.map((data: any) => { return data.keyword }));
            }).catch((err: any) => {
                reject(err.message);
            })
        })
    }
}