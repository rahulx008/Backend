import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import  {ApiError}  from "../utils/ApiError.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";

// User Registration Method
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

    // console.log(avatarLocalPath);
    
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

    return res.status(200).json(
        new ApiError(200, createdUser, "User registered Successfully")
    )
})

const generateAccessAndRefreshTokens = async (_id)=>{
    try {
        const user = await User.findById(_id);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        //validateBeforeSave is kept false because we dont want to validate other fields again.
        // only refresh token field is being updated here.
        await user.save({validateBeforeSave: false}); 
        //console.log("Token Generated:", accessToken);

        return {accessToken, refreshToken}   
    } catch (error) {
        new ApiError(500, "Something went wrong while generating refresh and access token");
    }

    
}

// User Login Method 
const loginUser = asyncHandler(async(req, res)=>{
    /*
        #1 req body -> data
        #2 username or email
        #3 find the user
        #4 password check
        #5 access and refresh token
        #6 send cookie
    */

    //#1 req body -> data
    const {username, password, email} = req.body;

    //#2 username or email
    if(!username && !email ){
        throw new ApiError(400, "username or email is required");
    }

    if(!password){
        throw new ApiError(400, "Password is required");
    }

    //#3 find the user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    //#4 password check
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }

    //#5 access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

// User Logout Method
const logoutUser = asyncHandler(async(req, res)=>{
    //get current user id
    //clear refreshToken
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: ""
            }
        },
        {
            new: true
        })     

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})

export {registerUser, loginUser, logoutUser};