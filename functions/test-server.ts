import * as express from 'express';
import {fxn} from './check-districts';

const app = express();


app.get('/district', (req, res) => res.json(fxn(req, res)));


app.listen(8000, () => {
  console.log(`Listening`);
});
