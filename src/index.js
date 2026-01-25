
import connectDB from './db/index.js'
import dotenv from 'dotenv'
import { app } from './app.js';

dotenv.config({path:'.env'})

connectDB().then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`App is running on port ${process.env.PORT}`);
    })
}).catch(
    (err)=>{
        console.log("Mongo db connection failed !!!", err);
    })



/*
//IIFE approach to initialize connection with DB.

import express from "express"
const app = express();

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on(error,(error)=>{
            console.log("Error");
            throw error
        })
        app.listen(process.env.PORT, ()=>{
            console.log("App is running on ", process.env.PORT);
            
        })

    } catch (error) {
        console.log("Error :", error);
    }
})()

*/