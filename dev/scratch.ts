import { inspect } from "util";
import Jstream from "../src/Jstream";
import { pick } from "../src/privateUtils/objects";
import { getCustomers } from "../testData/customers";
import { getProducts } from "../testData/products";
import { getPurchases } from "../testData/purchases";
import { getStackOverflowSurvey } from "../testData/stackOverFlowSurvey";
import { getStackOverflowSurveySchema } from "../testData/stackOverFlowSurveySchema";
use(inspect);

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
            .flatten()
            .flatten()
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

    const customers = customerData
        .groupJoin(
            purchases.join(
                products,
                purc => purc.productID,
                prod => prod.id,
                (purc, prod) => ({ ...purc, ...pick(prod, ["name", "price"]) })
            ),
            c => c.id,
            p => p.customerID,
            (c, p) => ({ ...c, purchases: p })
        )
        .collapse();
    use(customers);

    const ids = customers.map<number>(c => c.id).indexed();

    use(ids);

    let flag = false;
    const jsssss = Jstream.over(
        (function* () {
            yield 1;
            yield 2;
            yield* [3, 4, 5, 6, 7, 8];
            if (flag) yield 42;
        })()
    );

    console.log(jsssss.asArray());
    console.log(jsssss.asArray());
    console.log(jsssss.asArray());
    console.log(jsssss.asArray());
    console.log(jsssss.asArray());
    flag = true;
    console.log(jsssss.toArray());
    console.log(jsssss.toArray());
    console.log(jsssss.toArray());
    console.log(jsssss.toArray());
    console.log(jsssss.toArray());

    console.log(
        Jstream.generate(i => i * 2)
            .take(10)
            .toArray()
    );
    Jstream.generate(42, 42).indexed();

    console.log(
        customers
            .filter(c => c.purchases.length, "lessThan", 3)
            .map(c => ({ ...c, pc: c.purchases.length }))
            .map(c => pick(c, ["first_name", "last_name", "state", "pc"]))
            .skip(3)
            .take(5)
            .filter("state", "is", "AK")
            .groupBy("state")
            .toArrayRecursive()[0]
    );

    // const groups = Jstream.of(1,2,3,4,5,6).groupBy(n => n % 2 === 0).asArrayRecursive();

    Jstream.over([
        "foo",
        "bar",
        "train",
        "frog",
        "seat",
        "car",
        "truck",
        "funeral",
    ] as const)
        .filter("length", "is", 2)
        .pipe(s => console.log(s.asArrayRecursive()));

    // customers.append(1);
    // customers.asArray();
    // customers.asArrayRecursive();
    // customers.asMap();
    // customers.asSet();
    // customers.asStandardCollection();
    // customers.collapse();
    // customers.concat(customers);
    // customers.copyWithin(10, 1, 3);
    // customers.count();
    // customers.defined();
    // customers.every(c => c.id > 0 && c.id % 1 === 0);
    // customers.filter("state", "is", "MT");
    // customers.final();
    // customers.find(c => c.id === 9);
    // customers.findLast(c => c.id === 9);
    // customers.first();
    // customers.flatten();
    // customers.fold(
    //     0,
    //     (totalPurchaseCount, c) => c.purchases.length + totalPurchaseCount,
    //     (totalPurchaseCount, count) => totalPurchaseCount / count
    // );
    // customers.forEach(console.log);
    // customers.groupBy("city");
    // // customers.groupJoin()
    // customers.ifEmpty([3]);
    // customers.including([9]);
    // customers.indexed();
    console.log("reading stack overflow survey...");
    const stackSurvey = await getStackOverflowSurvey();
    console.log("done");
    console.log("reading survey schema...");
    const stackSurveySchema = await getStackOverflowSurveySchema();
    console.log("done");
    console.log(stackSurveySchema.map(["qname", "question", "type"]).asArray())
    // console.log(stackSurveySchema.map(["qname", "force_resp", "type"]).asArray());

    // stackSurvey.shuffle().take(5).pipe(s => console.log(s.asArray()));


}
main();
