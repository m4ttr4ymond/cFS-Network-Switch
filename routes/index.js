var express = require('express');
var path = require('path');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/js/:filename', function (req, res, next) {
  res.sendFile(path.join(__dirname, `../public/javascripts/${req.params.filename}`));
});

router.get('/style/:filename', function (req, res, next) {
  res.sendFile(path.join(__dirname, `../public/stylesheets/${req.params.filename}`));
});

router.get('/images/:filename', function (req, res, next) {
  res.sendFile(path.join(__dirname, `../public/images/${req.params.filename}`));
});

module.exports = router;
