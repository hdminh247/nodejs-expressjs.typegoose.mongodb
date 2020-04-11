// Charge item data in system
declare interface ChargeItem{
    _id: string,
    userId: string,
    bundleId: string,
    customerId: string,
    chargeId: string,
    data: StripeCharge,
    status: string
}

// Card item data in system
declare interface CardItem{
    _id: string,
    userId: string,
    customerId: string,
    cardId: string,
    name: string,
    fingerprint: string,
    data: StripeCard,
    deleted: boolean
}

// Stripe charge data
declare interface StripeCharge{
    amount: number,
    amount_refunded: number,
    balance_transaction: string,
    created: number,
    currency: string,
    description: string,
    payment_method: string,
    receipt_url: string,
    refunded: boolean,
}

// Stripe card data
declare interface StripeCard{
    brand: string,
    country: string,
    exp_month: number,
    exp_year: number,
    funding: string,
    last4: string
}
