import { Router } from 'express';
import * as libraryController from '../controllers/library.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const libraryRouter = Router();

libraryRouter.get('/', requireAuth, libraryController.listLibrary);
