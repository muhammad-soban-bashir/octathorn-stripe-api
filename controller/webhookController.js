

const endpointSecret = process.env.WEBHOOKSECRET; 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


 const handleStripeWebhook =  (req, res) => {

console.log(req.headers)
     console.log("webhook route hit");
  const sig = req.headers['stripe-signature'];

  let webHookEvent;

  try {
    webHookEvent = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
console.log(webHookEvent)
  // Handle the webHookEvent types
  switch (webHookEvent.type) {
    case 'invoice.payment_failed':
      const invoice = webHookEvent.data.object;
      console.log(`Payment failed for subscription: ${invoice.id}`);
      break;

    case 'customer.subscription.deleted':
      const subscription = webHookEvent.data.object;
      console.log(` Subscription canceled: ${subscription.id}`);
   
      break;

    default:
      console.log(`Unhandled webHookEvent type: ${webHookEvent.type}`);
  }

  res.status(200).json({ received: true });
};

module.exports = { handleStripeWebhook };