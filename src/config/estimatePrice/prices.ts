export const earningAndPayment = {
    service: {
        tax: {
            value: 19,
            unit: '%'
        },
    },
    payment: {
        partialPayment: {
            value: 50,
            unit: '%'
        },
        partialRefund: {
            value: 30,
            unit: '%'
        },
    },
    earning: {
        partialTransfer: {
            value: 70,
            unit: '%'
        },
    },
    discounts: {
        rentalCarThreeDays: {
            value: 20,
            unit: '%'
        },
        rentalCarSevenDays: {
            value: 30,
            unit: '%'
        },
        advanceBookingThreeMonths: {
            value: 20,
            unit: '%'
        },
        advanceBookingSixMonths: {
            value: 30,
            unit: '%'
        }
    }
}

export const listVanSizes = {
  "van":      [6, 8],
  "luxury":   [4],
  "business": [4]
};

export const listPrices = {
  "van": {
      "8": {
          "averageSpeed": {
              "value": 120,
              "unit": "km/h"
          },
          "workingHour": {
              "value": 8,
              "unit": "hours"
          },
          "distance": {
              "value": 500,
              "unit": "km"
          },
          "priceCar": {
              "value": 299,
              "unit": "€"
          },
          "priceDriver": {
              "value": 149,
              "unit": "€"
          },
          "additionalKm": {
              "value": 1.49,
              "unit": "€"
          },
          "quantityAllowed": {
              "persons": 7,
              "suitcases": 7,
              "handbags": 7
          }
      },
      "6": {
          "averageSpeed": {
              "value": 120,
              "unit": "km/h"
          },
          "workingHour": {
              "value": 8,
              "unit": "hours"
          },
          "distance": {
              "value": 500,
              "unit": "km"
          },
          "priceCar": {
              "value": 299,
              "unit": "€"
          },
          "priceDriver": {
              "value": 149,
              "unit": "€"
          },
          "additionalKm": {
              "value": 1.49,
              "unit": "€"
          },
          "quantityAllowed": {
              "persons": 7,
              "suitcases": 7,
              "handbags": 7
          }
      }
  },
  "luxury": {
      "4": {
          "averageSpeed": {
              "value": 140,
              "unit": "km/h"
          },
          "workingHour": {
              "value": 8,
              "unit": "hours"
          },
          "distance": {
              "value": 500,
              "unit": "km"
          },
          "priceCar": {
              "value": 399,
              "unit": "€"
          },
          "priceDriver": {
              "value": 199,
              "unit": "€"
          },
          "additionalKm": {
              "value": 2.99,
              "unit": "€"
          },
          "quantityAllowed": {
              "persons": 4,
              "suitcases": 2,
              "handbags": 2
          }
      }
  },
  "business": {
      "4": {
          "averageSpeed": {
              "value": 140,
              "unit": "km/h"
          },
          "workingHour": {
              "value": 8,
              "unit": "hours"
          },
          "distance": {
              "value": 500,
              "unit": "km"
          },
          "priceCar": {
              "value": 249,
              "unit": "€"
          },
          "priceDriver": {
              "value": 149,
              "unit": "€"
          },
          "additionalKm": {
              "value": 1.49,
              "unit": "€"
          },
          "quantityAllowed": {
              "persons": 4,
              "suitcases": 2,
              "handbags": 2
          }
      }
  },
  "driver": {
      "default": {
          "averageSpeed": {
              "value": 120,
              "unit": "km/h"
          },
          "workingHour": {
              "value": 8,
              "unit": "hours"
          },
          "priceDriver": {
              "value": 199,
              "unit": "€"
          }
      }
  }
};