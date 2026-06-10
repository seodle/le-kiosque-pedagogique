import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ticketsRouter from "./tickets";
import messagesRouter from "./messages";
import intervenerRouter from "./intervener";
import dashboardRouter from "./dashboard";
import referenceRouter from "./reference";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ticketsRouter);
router.use(messagesRouter);
router.use(intervenerRouter);
router.use(dashboardRouter);
router.use(referenceRouter);
router.use(adminRouter);

export default router;
