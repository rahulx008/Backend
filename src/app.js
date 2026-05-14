import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors';

const app=express();

// use keyword is used to add middlewares and configurations.
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
// to parse the incoming request body
app.use(express.urlencoded({extended:true, limit:'16kb'}))
app.use(express.static('public'));
app.use(cookieParser());

//routes declaration
import userRouter from './routes/user.router.js'
// the code says that whenever there is any route of users, the user-router will be used.
// We have defined user related routes in user-router file.
// the url will be like /api/v1/users/register or /api/v1/users/login
// middleware to handle user routes 
app.use("/api/v1/users", userRouter)

import subscriptionRouter from './routes/subscription.router.js'
app.use("/api/v1/subscriptions", subscriptionRouter)

import videoRouter from './routes/video.router.js'
app.use("/api/v1/videos", videoRouter);

import commentRouter from './routes/comment.router.js'
app.use("/api/v1/comments", commentRouter);

import likeRouter from './routes/like.router.js'
app.use("/api/v1/likes", likeRouter);

app.use("/api/v1/server", ( req, res ) => {
    res.send("Server is Up")
    return;
}
)

export {app}