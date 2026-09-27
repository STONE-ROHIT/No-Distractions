import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, userController.getMe);
