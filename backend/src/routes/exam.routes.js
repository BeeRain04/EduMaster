const express = require('express');
const router = express.Router();
const examCtrl = require('../controllers/exam.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/', authMiddleware, examCtrl.create);
router.put('/:id', authMiddleware, examCtrl.updateExam);
router.delete('/:id', authMiddleware, examCtrl.deleteExam);
router.get('/', examCtrl.list);
router.get('/free', examCtrl.getFreeExams);
router.get('/:id', examCtrl.getOne);
router.post('/:id/start', authMiddleware, examCtrl.start);

module.exports = router;
