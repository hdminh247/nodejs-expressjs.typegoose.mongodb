import * as JWT from 'jsonwebtoken';

export default {
    signToken: (id, provider) => {
        const iat = new Date().getTime();

        const exp = new Date().setDate(new Date().getDate() + 3); // 3 days

        return {
            token: JWT.sign({ iss: 'ApiAuth', id, provider, iat, exp }, process.env.JWT_SECRET),
            expiredAt: exp
        }
    }
}