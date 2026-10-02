import { Router } from 'express';
import * as videoController from '../controllers/video.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { importVideoSchema } from '../validators/video.validators.js';

export const videosRouter = Router();

videosRouter.post('/import', requireAuth, validate(importVideoSchema), videoController.importVideo);
videosRouter.get('/:id', requireAuth, videoController.getVideo);
