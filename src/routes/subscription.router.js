import { verifyJWT } from "../middlewares/auth.middleware.js";
import { subscribeChannel } from "../controllers/subscription.controller.js";
import { Router } from "express";

const subscriptionRouter = Router();

subscriptionRouter.route('/subscribe/:channelId').post(
    verifyJWT,
    subscribeChannel);


export default subscriptionRouter;