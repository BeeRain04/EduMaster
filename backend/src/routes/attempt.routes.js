const express = require('express');
const router = express.Router();
const attemptCtrl = require('../controllers/attempt.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/:id/submit',authMiddleware, attemptCtrl.submit);
router.get('/', authMiddleware, attemptCtrl.get);
router.post('/:id/answer', attemptCtrl.answerOne);

module.exports = router;
