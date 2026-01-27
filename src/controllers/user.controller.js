import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import  {ApiError}  from "../utils/ApiError.js"; 

const registerUser=asyncHandler(async(req,res)=>{
    /*
        #1 data from frontend
        #2 validation - not empty
        #3 check if user already exists: username, email
        #4 check for images, check for avatar
        #5 upload them to cloudinary, avatar
        #6 create user object - create entry in db
        #7 remove password and refresh token field from response
        #8 check for user creation
        #9 return res
    */
    
    //#1 - data from frontend
    const {
        fullname, email, username, password
        } = req.body;
    

    // #2 validation - not empty
    if([fullname, email, username, password].some((field)=>field?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    // #3 check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    });
    
    //#4 check for images, check for avatar
    
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists");
    }
    // const avatarLocalPath =req.files?.avatar[0]?.path;
    // const coverImageLocalPath =req.files?.coverImage[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let coverImageLocalPath;
    if (req.files?.coverImage && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required" );
    }

    console.log(avatarLocalPath);
    
    // #5 upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar) {
        throw new ApiError(400, "Error while uploading on avatar");
    }
    
    let coverImage;
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    // #6 create user object - create entry in db   
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });


    //#7 remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    //#8 check for user creation
    if(!createdUser){
        throw new ApiError(500, "Error while registering the user");
    }
    console.log("User created in DB");

    return res.status(200).json({
        message:"ok"
    })
})


export {registerUser};