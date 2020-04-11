// Purchase item data
declare interface PurchaseItem{
    userId: string,
    bundleId: string,
    receipt: any,
    service: string,
    purchaseData: InAppPurchaseData,
    status: string
}

// In app purchase data by receipt
declare interface InAppPurchaseData{
    transactionId: string,
    purchaseDate: number,
    productId: string,
    quantity: number,
    bundleId: string,
    appItemId: string,
    originalTransactionId: string,
    originalPurchaseDate: number,
    isTrial: boolean,
    expirationDate: number,
    cancellationDate: number,
    packageName: string,
    purchaseToken: string,
    autoRenewing: boolean
}