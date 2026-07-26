const express = require('express');
const router = express.Router();

const verifyCronToken = require('../middlewares/cronMiddleware');
const { dailyStudyStatus } = require('../controllers/cronController');

router.get('/daily-study-status', verifyCronToken, dailyStudyStatus);

module.exports = router;
