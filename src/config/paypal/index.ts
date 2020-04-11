export default () => {
    return {
        mode: process.env.PAYPAL_MODE,
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    }
}