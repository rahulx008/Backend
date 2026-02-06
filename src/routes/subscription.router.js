import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express";
import { subscribeChannel, unsubscribeChannel } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.route('/subscribe/:channelId').post(
    verifyJWT,
    subscribeChannel
);

subscriptionRouter.route('/unsubscribe/:channelId').post(
    verifyJWT,
    unsubscribeChannel
);


export default subscriptionRouter;