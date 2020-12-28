import { IImageHandler, ImageData } from "./IImageHandler"
import Log from "../Util"

export default class ImageHandler implements IImageHandler {
    constructor() {
        Log.info("ImageHandler::Image Handler Initiated")
    }

    public addImage(image: any, tags: string[]) : Promise<string> {
        return Promise.reject("Not implemented");
    }

    public searchImages() : Promise<ImageData[]> {
        return Promise.reject("Not implemented");
    }

    public searchImage(id: string) : Promise<ImageData> {
        return Promise.reject("Not implemented");
    }
}