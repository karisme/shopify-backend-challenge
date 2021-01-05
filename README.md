# shopify-backend-challenge
This is my code for Shopify's Backend Challenge W2021

Pre-Reqs:
- Amazon AWS Account (w/S3)
- EveryPixel API Access Key
- Node v14

The code implements a server where users can upload images and search for their specific images based on their tag (meta-data).

To run the code

1. Make sure you are using Node version 14
2. Clone the repo
3. Export the following environment variables:
- JWTOKEN (this can be any arbitrary string that will be used to sign JWT tokens) 
- AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY both come from your AWS account
- CLIENT_ID and CLIENT_SECRET which come from EveryPixel, create an account [here](https://labs.everypixel.com/api)
4. Run yarn install, make sure you have all the dependencies and debug as necessary
5. Run yarn start to launch the server, it will listen on port 1234 of localhost by default (feel free to change this on line 22 of App.ts).

The following endpoints are exposed:

```
GET /test -> Test endpoint from early development stage, kept it for the lols
```

```
GET /images -> Retrieves a list of all the images uploaded by the current user. Because I used JWT tokens for authentication, i can retrieve all the userInfo from the Authorization Header. The JSON returned is a list object under the S3ImageData type:

S3ImageData {
    id: unique ID of the resource in S3
    lastModified: date image was last modified (in this case uploaded)
    tags: list of tags associated with picture (up to three).
    imageURL: unique URL generated by AWS S3, valid for 5 minutes, client handles;
 }
```

```
GET /images/tag -> Same as above except client can specify a tag and images will be filtered, retunring only the ones that contain that tag.
```

```
POST /login -> This is the endpoint that client will need to autheticate with, returns a authorization token needs to be used with all other endpoints. User info is encrypted inside this token (thank you JWT). This was not the focus of the implementation and as such there are several limitations with this approach, (namely security and logging in after token expires). Consider using DB to store credentials.
```

```
POST /image -> This is the endpoint client can use to upload an image. Request must be made using multipart/form-data, 'image' key must have file binary and 'tag' key must have 3 tags seperated by commas. File size less than 15mb.
```

```
POST /imageTags -> This is the endpoint client can use retrieve tags for a given image. I created this endpoint because I can imagine a userflow in which a user picks an image to upload, this endpoint is called offering the three tags with the highest percentage of certainty, user either confirms or modifies the tags, then calls endpoint above to upload picture (also wanted to try EveryPixel's API looked cool).

Initially had this as part of the original image upload endpoint, but there is no guarantee that A) it is accurate, B) it is functional. Opted to leave it to the user to specify.
```

The so-called "business logic" is handled within ImageHandler and is abstracted away from the Server class. Reference the interface under the ImageProcessor folder for brief overview.