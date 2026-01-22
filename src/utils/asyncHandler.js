// Method 1 for ASYNC Handler
import * as res from 'express/lib/response'
import * as next from 'next'
const asyncHandler=(requestHandler)=>{
    (req, res, next)=>Promise.resolve(requestHandler(req,res,next))
    .catch((err)=>next(err))
}

export default asyncHandler;


/*
//Method 2 of Async Handler
    // It is a higher order function: takes function as a parameter and executes.
    // It is kind of wrapper function to repeated use of promise handling for a function

    const asyncHandler=(fn)=>{
        async (req, res, next)=>{
            try {   
                await fn(req, res, next);
            } catch (error) {
                res.error(error.code || 500).json({
                    success:false,
                    message:error.message   
                })
            }
        }
    }
*/