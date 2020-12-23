/*
 * Interface for ImageHandler Class, decided to seperate the logic
 * in it's own class in case I decided to add more to the image processing/storage logic
 * (ideas include using ML library to generate tags), or different types of searches (by order).
 */

 export interface ImageData {
    id: number;
    user: number;
    date: Date;
    tags: string[];
    data: string;
 }

 export interface IImageHandler {
     // prolly an id, auto-gen Date tags?, data, userID, 
     addImage(): Promise<string>;

     // admin vs non admin (your own pics vs all pics)
     searchImages(): Promise<ImageData[]>;
 }