import fs from "fs/promises";
import Tstream from "../src/Tstream";
import { lazy } from "../src/privateUtils/functional";

// export const getPurchases = lazy(async () => {
//     const customers = await getCustomers();
//     const products = await getProducts();
//     return customers
//         .map(c =>
//             Stream.generate(
//                 () => ({ customerID: c.id, productID: products.random().id }),
//                 random.choice([
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(0, 4),
//                     () => random.int(5, 8),
//                     () => random.int(5, 16),
//                     () => random.int(10, 21),
//                     () => random.int(100, 103),
//                 ])()
//             )
//         )
//         .cache()
//         .flat()
//         .cache();
// });

export interface Purchase {
    customerID: number;
    productID: number;
}

export const getPurchases = lazy(async (): Promise<Tstream<Purchase>> => {
    const data = await fs.readFile("./testData/purchaseData.json");
    const purchases = JSON.parse(data.toString()) as any[];
    return Tstream.from(purchases);
});
