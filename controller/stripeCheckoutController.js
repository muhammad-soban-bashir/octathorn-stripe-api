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
    message: "customer created successfully",
    customer: customerId,
  });
});

//  CREATE SUSCRIPTION  AND ACTUAL PAYMENT

const subscribeCustomer = asyncErrorHandler(async (req, res, next) => {
  const { customerId, plane } = req.body;

  if (!customerId) {
    throw new Error("please provide a customer id");
  }

  const subscriptionList = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  });
  console.log(subscriptionList.data.length);

  if (subscriptionList.data.length > 0) {
    throw new Error("you already have a subscription, please cancel it first");
  }
  const priceId = pricePlaneMap[plane.toLowerCase()];
  console.log("price id " + priceId);

  if (priceId === undefined) {
    throw new Error("please provide a valid plane");
  }

  const customerPaymentMethod = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });

  if (!customerPaymentMethod.invoice_settings.default_payment_method) {
    throw new Error("no payments method provided");
  }

  //   CREATE THE SUBSCRIPTION

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    expand: ["latest_invoice"],
  });

  //    console.log(JSON.stringify(subscription, null, 2));

  res.status(200).json({
    success: true,
    message: "subscription added successfully",
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionList: subscriptionList,
  });
});

// ATTACH OR UPDATE  PAYMENT METHOD TO CUSTOMER
const attachPaymentMethod = asyncErrorHandler(async (req, res, next) => {
  const { email, token } = req.body;

  if (!email) {
    throw new Error("please provide an email");
  }

  const customerList = await stripe.customers.list({
    email,
    limit: 1,
  });
  let customerId;
  if (customerList.data.length > 0) {
    customerId = customerList.data[0].id;
  } else {
    throw new Error("customer not found");
  }

  if (!token) {
    throw new Error("please provide a token");
  }

  const customerPaymentMethod = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  console.log(customerPaymentMethod.invoice_settings.default_payment_method);
let update = false
  if (customerPaymentMethod.invoice_settings.default_payment_method) {
     update = true
    await stripe.paymentMethods.detach(
      customerPaymentMethod.invoice_settings.default_payment_method.id
    );
  }

  // CREATAE  NEW PAYMENT METHOD WITH TOKEN
  console.log("create new payment method");
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      token,
    },
  });

  // ATTACHING PAYMENT METHOD TO CUSTOMER
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  // UPDATE CUSTOMER
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });

  res.status(200).json({
    success: true,
  
    message:"payment method updated successfully"
  });
});

// HISTORY OF PAYMENTS

const historyOfpayments = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new Error("please provide an email");
  }

  const customerList = await stripe.customers.list({
    email,
    limit: 1,
  });
  let customerId;
  if (customerList.data.length > 0) {
    customerId = customerList.data[0].id;
  } else {
    throw new Error("customer not found");
  }

  const paymentHistory = await stripe.invoices.list({
    customer: customerId,
    limit: 100,
  });

  console.log(paymentHistory);

  res.status(200).json({
    success: true,
    history: paymentHistory.data.length,
    data: paymentHistory.data.map((payment) => {
      return {
        amount: payment.amount_paid,
        status: payment.status,
        created: new Date(payment.created * 1000).toLocaleDateString(),
      };
    }),
  });
});

// LIST SUBSCRIPTIONS

// CANCEL SUBSCRIPTIONS

const cancelSubscription = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    throw new Error("please provide an email");
  }

  const customerList = await stripe.customers.list({
    email,
    limit: 1,
  });

  let customerId;
  if (customerList.data.length > 0) {
    customerId = customerList.data[0].id;
  } else {
    throw new Error("customer not found");
  }

  const subscriptionList = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
  });

  let subscriptionId;
  if (subscriptionList.data.length === 0) {
    throw new Error("no active subscription found for this customer");
  } else if (subscriptionList.data[0].status !== "active") {
    throw new Error("subscription is not active, cannot cancel");
  } else if (subscriptionList.data[0].status === "active") {
    subscriptionId = subscriptionList.data[0].id;
  }

  if (subscriptionList.data.length === 0) {
    throw new Error("no active subscription found for this customer");
  }

  console.log(subscriptionList.data[0].id);

  // Cancel the subscription

  const cancelSubscription = await stripe.subscriptions.cancel(subscriptionId);
  console.log(cancelSubscription);

  res.status(200).json({
    success: true,
    message: "subscription cancelled successfully",
    status: cancelSubscription.status,
    subscriptionId: cancelSubscription.id,
  });
});

// DELETE PAYMENT METHOD

const deletePaymentMethod = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    throw new Error("please provide an email");
  }

  const customerList = await stripe.customers.list({
    email,
    limit: 1,
  });

  let customerId;
  if (customerList.data.length > 0) {
    customerId = customerList.data[0].id;
  } else {
    throw new Error("customer not found");
  }

  const customerPaymentMethod = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  console.log(customerPaymentMethod.invoice_settings.default_payment_method);

  if (customerPaymentMethod.invoice_settings.default_payment_method) {
    await stripe.paymentMethods.detach(
      customerPaymentMethod.invoice_settings.default_payment_method.id
    );
  } else {
    throw new Error("no payment method found which can be deleted");
  }

  res.status(200).json({
    success:true,
    message:"payment method deleted successfully"
  })
});

module.exports = {
  createCustomer,
  subscribeCustomer,
  historyOfpayments,
  cancelSubscription,
  deletePaymentMethod,
  attachPaymentMethod,
};
