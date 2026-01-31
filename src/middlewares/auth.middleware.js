import asyncHandler from "../utils/asyncHandler.js"
import jwt from 'jsonwebtoken'
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";



//verifyJWT is a middleware made by us 
// This is a middleware which will verify the JWT token sent by the client
// also it is to add req.user in req

export const verifyJWT = asyncHandler(async (req, res, next)=>{
// could be written as => export const verifyJWT = asyncHandler(async (req, _, next)=>{

    try {
        // we are having cookies in req because we used cookie-parser middleware
        // we are also sending cookies from client side
        // access token is sent in cookie named accessToken
        //if the token is coming from the header of api request which starts with " Bearer <token>"
        const token  = req?.cookies?.accessToken || req.headers["Authorization"]?.replace("Bearer ", "");
        
        if(!token){
            
            throw new ApiError(401, "Unauthorized Access - No token");
        }
    
        //verify the token now
        //jwt has the method verify which takes token and secret key to verify a given token.
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken");
        
        if(!user){
            throw new ApiError(401, "Unauthorized Access - User not found");
        }

        // added field "user" in req ongoing
        req.user =user;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid Access Token");
    }
})