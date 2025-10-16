const express = require('express');
const router = express.Router();
const qCtrl = require('../controllers/question.controller');
const { authMiddleware, adminOnly } = require('../middlewares/auth.middleware');

router.get('/', qCtrl.list);
router.get('/:id', qCtrl.getOne);
router.post('/', authMiddleware, adminOnly, qCtrl.create);
router.put('/:id', authMiddleware, adminOnly, qCtrl.update);
router.delete('/:id', authMiddleware, adminOnly, qCtrl.remove);

module.exports = router;
