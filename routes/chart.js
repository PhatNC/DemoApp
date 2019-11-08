const { Router } = require('express')
const router = Router()

router.get('/chart', function (req, res) {
    res.render('chart.html');
});

module.exports = router
