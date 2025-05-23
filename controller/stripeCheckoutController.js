const asyncErrorHandler = require("../utils/asyncErrorHandler");
const pricePlaneMap = require("../utils/pricePlaneMap.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//  CREATE CUSTOMER IN STRIPE

const createCustomer = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new Error("please provide an email");
  }

  let customerId;

  const customerList = await stripe.customers.list({
    email,
    limit: 1,
  });
  console.log(customerList);

  if (customerList.data.length > 0) {
    customerId = customerList.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email,
    });
    console.log(customer);

    customerId = customer.id;
  }
  console.log(customerId);

  res.status(200).json({
    success: true,
    customer: customerId,
  });
});

//  CREATE SUSCRIPTION  AND ACTUAL PAYMENT

const subscribeCustomer = asyncErrorHandler(async (req, res, next) => {
  const { customerId, token, plane, paymentMethodId } = req.body;

  if (!customerId) {
    throw new Error("please provide a customer id");
  }

  const priceId = pricePlaneMap[plane.toLowerCase()];
  console.log("price id " + priceId);

  if (priceId === undefined) {
    throw new Error("please provide a valid plane");
  }

  let finalPaymentMethodId;

  if (token) {
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        token,
      },
    });
    // attach new payment method to customer

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    finalPaymentMethodId = paymentMethod.id;
  } else if (paymentMethodId) {
    finalPaymentMethodId = paymentMethodId;
  } else {
    const retriveDeafultPaymentMethod = await stripe.customers.retrieve(
      customerId,
      {
        expand: ["invoice_settings.default_payment_method"],
      }
    );
    if (retriveDeafultPaymentMethod.invoice_settings.default_payment_method) {
      finalPaymentMethodId =
        retriveDeafultPaymentMethod.invoice_settings.default_payment_method.id;
    } else {
      throw new Error("no payment method provided or found");
    }
  }

  await stripe.paymentMethods.attach(finalPaymentMethodId, {
    customer: customerId,
  });

  const result = await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: finalPaymentMethodId,
    },
  });

  console.log(JSON.stringify(result, null, 2));

  console.log("finalPaymentMethodId" + finalPaymentMethodId);

  //   CREATE THE SUBSCRIPTION

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    expand: ["latest_invoice"],
  });

  //    console.log(JSON.stringify(subscription, null, 2));
  console.log(subscription);

  res.status(200).json({
    success: true,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });
});


// HISTORY OF PAYMENTS



const historyOfpayments = asyncErrorHandler(async (req, res, next) => {

    const {email} = req.body

    if (!email) {
    throw new Error("please provide an email");
  }

const customerList = await stripe.customers.list({
    email,
    limit:1
})
let customerId;
if(customerList.data.length > 0){
    customerId = customerList.data[0].id
}
else{
    throw new Error("customer not found")
}


const paymentHistory = await stripe.invoices.list({
    customer: customerId,
  limit: 100,
});


console.log(paymentHistory)

res.status(200).json({
    success:true,
    history:paymentHistory.data.length,
    data: paymentHistory.data.map((payment) => {
        return {
            
            amount: payment.amount_paid,
            status: payment.status,
            created: new Date(payment.created * 1000).toLocaleDateString(),
           
        };
    })
})
})

// LIST SUBSCRIPTIONS

// CANCEL SUBSCRIPTIONS


const cancelSubscription = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;
    if (!email) {
        throw new Error("please provide an email");
    }

    const customerList = await stripe.customers.list({      
         email,
         limit:1
        
        })


        let customerId;
if(customerList.data.length > 0){
    customerId = customerList.data[0].id
}
else{
    throw new Error("customer not found")
}


const subscriptionList = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  });

  

  res.status(200).json({
    success: true,
    message: "subscription deleted",
    subscriptionAmount: subscriptionList.data.map((subscription) => {
        return {
        
            status: subscription.status,
            created: new Date(subscription.created * 1000).toLocaleDateString(),
        };
    })
  });
})






// DELETE PAYMENT METHOD

module.exports = {
  createCustomer,
  subscribeCustomer,
  historyOfpayments,
  cancelSubscription
};
