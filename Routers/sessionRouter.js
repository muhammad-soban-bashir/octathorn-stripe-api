const express = require("express");
const { createCustomer ,subscribeCustomer,historyOfpayments,cancelSubscription} = require("../controller/stripeCheckoutController");

const router = express.Router();

router.post('/create-customer',createCustomer)
router.post('/subscribe',subscribeCustomer)
router.post('/history-of-payments',historyOfpayments)
router.post('/cancel-subscription',cancelSubscription)

         


module.exports = router