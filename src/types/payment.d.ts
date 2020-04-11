
declare interface TransactionItem{
    _id: string,
    transactionId: string,
    captureId: string,
    jobId: string,
    jobRequestId: string,
    cardId: string,
    userId: string,
    bankId: string,
    companyId: string,
    method: string,
    paymentMethod: any,
    amount: {
        value: number,
        unit: string
    },
    currency: string,
    country: string,
    type: string,
    date: string,
    status: string
}