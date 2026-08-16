const router = require('express').Router();
const controller = require('../controllers/dev8-demo.controller');

router.post('/session', controller.session);

module.exports = router;
