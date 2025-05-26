const express = require("express");
const { createCustomer ,subscribeCustomer,historyOfpayments,cancelSubscription,attachPaymentMethod,deletePaymentMethod} = require("../controller/stripeCheckoutController");

const router = express.Router();

router.post('/create-customer',createCustomer)
router.post('/subscribe',subscribeCustomer)
router.post('/history-of-payments',historyOfpayments)
router.post('/cancel-subscription',cancelSubscription)

router.post('/attach-payment-method',attachPaymentMethod)
router.post('/delete-payment-method',deletePaymentMethod)




         


module.exports = router