interface IPromotion {
    priority: number,
    title: string,
    discount: number,
    maximumPrice: number,
    content: string,
    category: string,
    subCategory?: string,
    type: string,
    image: string
}
const promotions: IPromotion[] = [
    {
        priority: 1,
        title: 'Discount 5% for Luxury',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'luxury',
        type: 'reuseable',
        image: 'promotion1.jpg'
    },
    {
        priority: 1,
        title: 'Discount 5% for Van',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'van',
        type: 'reuseable',
        image: 'promotion2.jpg'
    },
    {
        priority: 1,
        title: 'Discount 5% for Business',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'business',
        type: 'reuseable',
        image: 'promotion3.jpg'
    },
    {
        priority: 1,
        title: 'Discount 5% for Motorcycle',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'motorcycle',
        subCategory: 'Superbike',
        type: 'reuseable',
        image: 'promotion4.jpg'
    },
    {
        priority: 1,
        title: 'Discount 5% for Sport Car',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'sport_cars',
        subCategory: 'Ferrari',
        type: 'reuseable',
        image: 'promotion5.jpg'
    },
    {
        priority: 1,
        title: 'Discount 5% for Driver',
        discount: 5,
        maximumPrice: 100,
        content: '<p>Discount 5% for customer</p>',
        category: 'driver',
        type: 'reuseable',
        image: 'promotion6.jpg'
    }
];

export default promotions