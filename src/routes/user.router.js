import { Router } from "express";   
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();


//created fields for upload in multer
const uploadMiddleware = upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ])

    // req.files is the array of `avatar` and `coverImage` uploaded files respectively file
    // req.body will hold the text fields, if there were any

    // will have access to req.files
    // actually we can pass multiple middleware like this

router.route("/register").post(
    uploadMiddleware,
    registerUser // it is a callback function 

);

export default router;


// router.route("/register").post(
//     upload.fields([
//         {
//             name: "avatar",
//             maxCount: 1
//         }, 
//         {
//             name: "coverImage",
//             maxCount: 1
//         }
//     ]),
//     registerUser
//     )