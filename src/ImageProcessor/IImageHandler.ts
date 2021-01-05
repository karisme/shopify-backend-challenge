/*
 * Interface for ImageHandler Class, decided to seperate the logic
 * in it's own class in case I decided to add more to the image processing/storage logic
 * (ideas include using ML library to generate tags), or different types of searches (by date/user/tags).
 */

 export interface S3ImageData {
    id: number;
    lastModified: string;
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
      * Goal is to upload image to S3 because cheap and easy/fast to access
      */
     addImage(userID: string, filePath: string, fileExt: string, tags: string[]): Promise<string>;

     /**
      * 
      * @param userID 
      * @param tag 
      * 
      * Gets images from userID, then filters based on whether metadata has the tag
      */
     getImagesByTag(userID: string, tag: string) : Promise<S3ImageData[]>;
     
     /**
      * 
      * @param userID 
      * 
      * Leverages the folder organization in S3, gets all of user's images via userID
      */
     getImagesByUserId(userID: string) : Promise<S3ImageData[]>;

     /**
      * 
      * @param filePath 
      * 
      * This function makes use of the EveryPixel API, uses ML to create a list of 
      * descriptors for a given image, each with a percentage of certainty.
      */
     fetchTags(filePath: string): Promise<string[]>;
 }