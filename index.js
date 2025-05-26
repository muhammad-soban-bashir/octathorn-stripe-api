const express = require("express");
require("dotenv").config();
const sessionRouter = require('./Routers/sessionRouter.js')
const webHookRouter = require('./Routers/webHookRoouter.js')


const errorHandler = require("./middleware/errorHandler.js");

const app = express();

app.use('/webhook', webHookRouter)
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
app.use(express.json());

app.use('/payment', sessionRouter)



app.use(errorHandler)
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});


