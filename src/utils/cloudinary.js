import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import dotenv from "dotenv";

dotenv.config();


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// console.log("Cloudinary Config:", {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY ? "***" : "NOT SET",
//   api_secret: process.env.CLOUDINARY_API_SECRET ? "***" : "NOT SET"
// });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.log("Cloudinary upload error:", error.message)
        console.log(localFilePath)
        // remove the locally saved temporary file as the upload operation got failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

const deleteOnCloudinary = async (publicId, resourceType = "video") => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return response;
    } catch (error) {
        console.log("Cloudinary delete error:", error);
        return null;
    }

}




export {uploadOnCloudinary, deleteOnCloudinary}