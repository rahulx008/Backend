import { ApiError } from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler.js";
import fs from 'fs';

// middleware to validate the file before upload
// it checks if the size and type of the file is correct

export const validateFile = asyncHandler((req, res, next)=>{
    const MAX_VIDEO_SIZE = 30; //MB
    const MAX_IMAGE_SIZE = 3; //MB

    const ALLOWED_MIME_TYPES = {
        video: ["video/mp4", "video/webm"],
        image: ["image/jpeg", "image/png", "image/webp"],
    };

    const {video, thumbnail}= req.files||{};
    const singleFile =req.file || null;

    const deleteFile = (file)=>{
        if(file.path){
            try{
                fs.unlinkSync(file.path);
                console.log("File deleted successfully");
            }catch (error) {
                console.error("Error deleting file:", error)
            }
        }
        
    }
    
    try {
        // validation for video
        if(video?.[0]){
            const videoFile =video[0];
            if(!ALLOWED_MIME_TYPES.video.includes(videoFile.mimetype)){
                deleteFile(videoFile);
                throw new ApiError(400, "Invalid video format. Only MP4 and WebM are allowed.");
            }
            if(videoFile.size > MAX_VIDEO_SIZE*1024*1024){
                deleteFile(videoFile);
                throw new ApiError(400, "Video size exceeds the maximum limit of 30MB.");
            }
    
        }
    
        // Validation for thumbnail
        if(thumbnail?.[0]){
            const thumbnailFile = thumbnail[0];
            if(!ALLOWED_MIME_TYPES.image.includes(thumbnailFile.mimetype)){
                deleteFile(thumbnailFile);
                throw new ApiError(400, "Invalid image format. Only jpeg, png and webp are allowed.");
            }
            if(thumbnailFile.size > MAX_IMAGE_SIZE*1024*1024){
                deleteFile(thumbnailFile);
                throw new ApiError(400, "Thumbnail size exceeds the maximum limit of 3MB.");
            }
        }
    
        // Validation for single image file
        if(singleFile){
            const file = singleFile;
            if(!ALLOWED_MIME_TYPES.image.includes(file.mimetype)){
                deleteFile(file);
                throw new ApiError(400, "Invalid image format. Only jpeg, png and webp are allowed.");
            }
            if(file.size > MAX_IMAGE_SIZE*1024*1024){
                deleteFile(file);
                throw new ApiError(400, "Image size exceeds the maximum limit of 3MB.");
            }
        }
        
        next(); // if validation is successfull with no error

    } catch (error) {
        next(error)
    }
})