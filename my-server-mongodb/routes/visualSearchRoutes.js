const express = require('express');
const { visualSearch } = require('../controllers/visualSearchController');

const router = express.Router();

router.post('/search-location', visualSearch);

module.exports = router;