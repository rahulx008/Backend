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
        // read token from cookies first, then Authorization header (case-insensitive)
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        const token = req?.cookies?.accessToken || authHeader?.replace(/^Bearer\s+/i, '');

        if (!token) {
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