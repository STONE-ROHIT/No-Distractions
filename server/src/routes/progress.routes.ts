import { Router } from 'express';
import * as progressController from '../controllers/progress.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { saveProgressSchema } from '../validators/progress.validators.js';

export const progressRouter = Router();

progressRouter.use(requireAuth);
progressRouter.get('/', progressController.listInProgress);
progressRouter.get('/:videoId', progressController.getProgress);
progressRouter.put('/:videoId', validate(saveProgressSchema), progressController.saveProgress);
