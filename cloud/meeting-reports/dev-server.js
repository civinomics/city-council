const functions = require('./dist/build/main');
const express = require('express');
const template =
    `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SERVER</title>
  <base href="/">
  <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
<rankit-widget-root>Loading...</rankit-widget-root>
</html>
`;

const app = express();


app.set('view engine', 'html');
app.set('views', 'src');

app.engine('html', function (_, options, callback) {
    console.log('in engine');
    console.log(options.req.url);
    const url = options.req.url.split('meeting/')[1];
    functions.renderReport(url).then(html => callback(null, html));
});

app.get('/meeting/**', function (req, res) {
    console.log('rendering!');
    res.render('index', {req, res});
});

app.listen(4202, () => {
    console.log('listening!');
});

