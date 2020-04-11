export default () => {
    return {
        publishKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: {
            stripeAccount: process.env.STRIPE_WEBHOOK_SECRET_STRIPE_ACCOUNT,
            connectAccount: process.env.STRIPE_WEBHOOK_SECRET_CONNECT_ACCOUNT,
        }
    }
}