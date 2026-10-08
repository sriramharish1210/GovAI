import { Router } from 'express';
import { getBookmarks, addBookmark, removeBookmark } from '../controllers/bookmarks';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Bookmarks require authentication
router.use(authenticate);

router.get('/', getBookmarks);
router.post('/', addBookmark);
router.delete('/:schemeId', removeBookmark);

export default router;
