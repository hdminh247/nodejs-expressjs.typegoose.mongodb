import { listPrices, listVanSizes, earningAndPayment } from './prices';

export default ()=>{
    return {
        earningAndPayment: earningAndPayment,
        listPrices: listPrices,
        listVanSizes: listVanSizes
    }
};