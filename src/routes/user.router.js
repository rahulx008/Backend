import { Router } from "express";   
import { registerUser, loginUser, logoutUser} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


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

router.route("/login").post(
    loginUser
)

router.route("/logout").post(
    //verifyJWT is a middleware made by us to add req.user in req before performing logoutUser
    verifyJWT,
    logoutUser
)

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