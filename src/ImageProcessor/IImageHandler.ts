/*
 * Interface for ImageHandler Class, decided to seperate the logic
 * in it's own class in case I decided to add more to the image processing/storage logic
 * (ideas include using ML library to generate tags), or different types of searches (by date/user/tags).
 */

 export interface ImageData {
    id: number;
    user: number;
    date: Date;
    tags: string[];
    imageURL: string;
 }

 export interface IImageHandler {
     /**
      * 
      * @param image 
      * @param tags 
      * @param userID
      * 
      * Goal is to upload image to S3 using user info to enable quick retrieval
      */
     addImage(userID: string, filePath: string, fileExt: string, tags: string[]): Promise<string>;

     // admin vs non admin (your own pics vs all pics)
     searchImages(): Promise<ImageData[]>;

     searchImage(id: string) : Promise<ImageData>;

     fetchTags(filePath: string): Promise<string[]>;
 }