const express =  require("express");

const { handleStripeWebhook } = require("../controller/webhookController.js");


const router = express.Router();
// Define the webhook route     

router.post("", express.raw({ type: "application/json" }), handleStripeWebhook);

module.exports = router;