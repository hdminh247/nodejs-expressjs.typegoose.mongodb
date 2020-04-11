interface ICategory {
    name: string,
    key: string,
    allowSubCategory: boolean,
    description: string,
    icon: string,
    priority: number,
    image: string
}

const categories: ICategory[] = [
    {
        name: 'Luxury',
        key: 'luxury',
        allowSubCategory: false,
        description: 'A luxury vehicle is intended to provide passengers (and often the driver) with increased comfort, a higher level of equipment and increased perception of quality than regular cars (such as economy cars, which are intended as basic low-cost transportation devices) for an increased price.',
        icon: '',
        priority: 1,
        image: 'Luxury.jpg'
    },
    {
        name: 'Van',
        key: 'van',
        allowSubCategory: false,
        description: 'A van is a type of road vehicle used for transporting goods or people. Depending on the type of van, it can be bigger or smaller than a truck and SUV, and bigger than a common car.',
        icon: '',
        priority: 2,
        image: 'Van.jpg'
    },
    {
        name: 'Business',
        key: 'business',
        allowSubCategory: false,
        description: 'string',
        icon: '',
        priority: 3,
        image: 'Business.jpg'
    },
    {
        name: 'Motorcycle',
        key: 'motorcycle',
        allowSubCategory: true,
        description: 'A motorcycle, often called a bike, motorbike, or cycle, is a two- or three-wheeled motor vehicle. Motorcycle design varies greatly to suit a range of different purposes: long distance travel, commuting, cruising, sport including racing, and off-road riding. Motorcycling is riding a motorcycle and related social activity such as joining a motorcycle club and attending motorcycle rallies.',
        icon: '',
        priority: 4,
        image: 'Motorcycle.jpg'
    },
    {
        name: 'Sport Cars',
        key: 'sport_cars',
        allowSubCategory: true,
        description: 'A sports car is designed to emphasise handling, performance or thrill of driving. Sports cars originated in Europe in the early 1900s and are currently produced by many manufacturers around the world.',
        icon: '',
        priority: 5,
        image: 'Sport Cars.jpg'
    },
    {
        name: 'Driver',
        key: 'driver',
        allowSubCategory: false,
        description: 'Driver category',
        icon: '',
        priority: 6,
        image: 'driver.jpg'
    }
];

export default categories