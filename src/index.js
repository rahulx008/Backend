
import connectDB from './db/index.js'
import dotenv from 'dotenv'


dotenv.config({path:'.env'})
connectDB();

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