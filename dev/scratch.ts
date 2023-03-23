import Jstream from "../src/Jstream";
import { pick } from "../src/privateUtils/objects";
import { getCustomers } from "../testData/customers";
import { getProducts } from "../testData/products";
import { getPurchases } from "../testData/purchases";

/** stops unused errors */
function use(..._things: any): void {}

async function main() {
    const customerData = await getCustomers();
    const products = await getProducts();
    const purchases = await getPurchases();
    use(customerData, products, purchases);
    console.log(
        Jstream.over([1, 2, 3, 4] as const).fold(
            9,
            (a, b) => a + b,
            (r, c) => r / c
        )
    );

    



    const testtest = Jstream.of(
        undefined,
        3,
        undefined,
        4,
        7,
        undefined,
        null,
        7,
        undefined,
        8,
        null
    ).defined();
    console.log(testtest.toString());

    console.log(
        Jstream.of(1, 3, 5, 6)
            .filter(n => n % 2 === 0)
            .ifEmpty([42])
            .reduce(
                (a, b) => a + b,
                (r, c) => r / c
            )
    );

    console.log(
        Jstream.over([1, 2, 3, [4, 5, 6, [7, 8, 9]]] as const)
            .flat()
            .flat()
            .toArray()
    );

    console.log(JSON.stringify(Jstream.of(1, 2, 3)));
    console.log(
        Jstream.over("the quick brown fox jumps over the lazy dog").makeString()
    );

    // convert object to map
    const obj = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const map = Jstream.fromObject(obj).toMap();

    console.log({ obj, map });

    // convert map to object

    const obj2 = Jstream.over(map).toObject();

    console.log({ map, obj2 });

    const customers = customerData.groupJoin(
        purchases.join(
            products,
            purc => purc.productID,
            prod => prod.id,
            (purc, prod) => ({ ...purc, ...pick(prod, ["name", "price"]) })
        ),
        c => c.id,
        p => p.customerID,
        (c, p) => ({ ...c, purchases: p })
    ).collapse();
    use(customers);



    const ids = customers.map<number>(c => c.id).indexed();

    use(ids);

    
}
main();
