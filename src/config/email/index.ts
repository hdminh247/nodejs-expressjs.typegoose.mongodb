export default ()=>{
    return {
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        username: process.env.EMAIL_USENAME,
        password: process.env.EMAIL_PASSWORD,
    }
};