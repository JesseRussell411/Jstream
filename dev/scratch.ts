import { inspect } from "util";
import Jstream, { SortedJstream } from "../src/Jstream";
import { pick } from "../src/privateUtils/objects";
import { Customer, getCustomers } from "../testData/customers";
import { getProducts } from "../testData/products";
import { getPurchases } from "../testData/purchases";
import { getStackOverflowSurvey } from "../testData/stackOverFlowSurvey";
import { getStackOverflowSurveySchema } from "../testData/stackOverFlowSurveySchema";
import { requireNumberToBe } from "../src/privateUtils/errorGuards";
import AsyncJstream from "../src/AsyncJstream";
import { max, min, takeFinal } from "../src/privateUtils/data";
import { reverseOrder } from "../src/sorting/sorting";
import DoubleLinkedList from "../src/privateUtils/dataStructures/DoubleLinkedList";
use(inspect);

/** stops unused errors */
function use(..._things: any): void {}

async function main() {
    // const customerData = await getCustomers();
    // const products = await getProducts();
    // const purchases = await getPurchases();
    // use(customerData, products, purchases);
    // console.log(
    //     Jstream.from([1, 2, 3, 4] as const).fold(
    //         9,
    //         (a, b) => a + b,
    //         (r, c) => r / c
    //     )
    // );

    // const testtest = Jstream.of(
    //     undefined,
    //     3,
    //     undefined,
    //     4,
    //     7,
    //     undefined,
    //     null,
    //     7,
    //     undefined,
    //     8,
    //     null
    // ).defined();
    // console.log(testtest.toString());

    // console.log(
    //     Jstream.of(1, 3, 5, 6)
    //         .filter(n => n % 2 === 0)
    //         .ifEmpty([42])
    //         .reduce(
    //             (a, b) => a + b,
    //             (r, c) => r / c
    //         )
    // );

    // console.log(
    //     Jstream.from([1, 2, 3, [4, 5, 6, [7, 8, 9]]] as const)
    //         .flatten()
    //         .flatten()
    //         .toArray()
    // );

    // console.log(JSON.stringify(Jstream.of(1, 2, 3)));
    // console.log(
    //     Jstream.from("the quick brown fox jumps over the lazy dog").makeString()
    // );

    // convert object to map
    // const obj = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    // const map = Jstream.fromObject(obj).toMap();

    // console.log({ obj, map });

    // convert map to object

    // const obj2 = Jstream.from(map).toObject();

    // console.log({ map, obj2 });

    // const customers = customerData
    //     .groupJoin(
    //         purchases.join(
    //             products,
    //             purc => purc.productID,
    //             prod => prod.id,
    //             (purc, prod) => ({ ...purc, ...pick(prod, ["name", "price"]) })
    //         ),
    //         c => c.id,
    //         p => p.customerID,
    //         (c, p) => ({ ...c, purchases: p })
    //     )
    //     .collapse();
    // use(customers);

    // const ids = customers.map<number>(c => c.id).indexed();

    // use(ids);

    // let flag = false;
    // const jsssss = Jstream.from(
    //     (function* () {
    //         yield 1;
    //         yield 2;
    //         yield* [3, 4, 5, 6, 7, 8];
    //         if (flag) yield 42;
    //     })()
    // );

    // console.log(jsssss.asArray());
    // console.log(jsssss.asArray());
    // console.log(jsssss.asArray());
    // console.log(jsssss.asArray());
    // console.log(jsssss.asArray());
    // flag = true;
    // console.log(jsssss.toArray());
    // console.log(jsssss.toArray());
    // console.log(jsssss.toArray());
    // console.log(jsssss.toArray());
    // console.log(jsssss.toArray());

    // console.log(
    //     Jstream.generate(i => i * 2)
    //         .take(10)
    //         .toArray()
    // );
    // Jstream.generate(42, 42).indexed();

    // console.log(
    //     customers
    //         .filter(c => c.purchases.length, "lessThan", 3)
    //         .map(c => ({ ...c, pc: c.purchases.length }))
    //         .map(c => pick(c, ["first_name", "last_name", "state", "pc"]))
    //         .skip(3)
    //         .take(5)
    //         .filter("state", "is", "AK")
    //         .groupBy("state")
    //         .toArrayRecursive()[0]
    // );

    // const groups = Jstream.of(1,2,3,4,5,6).groupBy(n => n % 2 === 0).asArrayRecursive();

    // Jstream.from([
    //     "foo",
    //     "bar",
    //     "train",
    //     "frog",
    //     "seat",
    //     "car",
    //     "truck",
    //     "funeral",
    // ] as const)
    //     .filter("length", "is", 2)
    //     .applyTo(s => console.log(s.asArrayRecursive()));

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
    // console.log("reading stack overflow survey...");
    // const stackSurvey = await getStackOverflowSurvey();
    // console.log("done");
    // console.log("reading survey schema...");
    // const stackSurveySchema = await getStackOverflowSurveySchema();
    // console.log("done");
    // console.log(
    //     stackSurveySchema
    //         .map(["qname", "question", "type", "selector", "type"])
    //         .asArray()
    // );

    // const array = [1,2,3,4];
    // const jstream = Jstream.from(array);
    // console.log(jstream.asArray() === array);
    //@ts-ignore
    // jstream.asArray()[0] = 9;

    // console.log(array);

    // jstream.groupBy(n => n / 2).asArrayRecursive()

    // const func = jstream.toArray;

    // console.log(func());

    //

    // console.log(stackSurveySchema.map(["qname", "force_resp", "type"]).asArray());

    // stackSurvey.shuffle().take(5).pipe(s => console.log(s.asArray()));

    // customers.filter("state", "is", "MT");

    // console.log(Jstream.range(11).takeEveryNth(10n).toArray());

    // customers.filter("state", "is", "MA");

    // const customersFiltered = customers.fold(
    //     [[] as Customer[], [] as Customer[]] as const,
    //     (dest, c) => {
    //         if (c.purchases.length < 2) {
    //             dest[0].push(c);
    //         } else {
    //             dest[1].push(c);
    //         }
    //         return dest;
    //     },
    //     dest => dest.map(Jstream.over)
    // );

    // AsyncJstream.over([
    //     Promise.resolve(2),
    //     4,
    //     Promise.resolve(Promise.resolve(6)),
    // ])
    //     .map(item => {
    //         if (typeof item === "number") {
    //             return item + 1;
    //         } else {
    //             return item;
    //         }
    //     })
    //     .filter(item => item instanceof Promise)
    //     .await()
    //     .reduce(
    //         (a, b) => Promise.resolve(a + b),
    //         (total, count) => Promise.resolve(total / count)
    //     )
    //     .then(console.log);

    // console.log(Promise.resolve(Promise.resolve(42)));
    // console.log("----------------------------\n\n\n\n\n\n\n\n");
    // console.log(Jstream.from([1, 1, 2, 3, 4, 5]).sort().take(5).asArray());

    // arr.sort((a, b) => a.charAt(0).localeCompare(b.charAt(0)));
    // console.log(arr);

    for (let i = 0; i < 5; i++) {
        let start = performance.now();
        for (let j = 0; j < 10000; j++) {
            const sqrt = Math.sqrt(Number.MAX_SAFE_INTEGER);
        }
        let stop = performance.now();

        console.log(stop - start);
    }
    console.log("=============");

    const items = Jstream.generate(
        () => Math.trunc(Math.random() * 10_000_000_000),
        1_000_000
    ).toArray();

    for (let i = 0; i < 5; i++) {
        let start = performance.now();
        const minItems = min(items, 100, (a, b) => a - b);
        let stop = performance.now();
        console.log(stop - start);
    }

    console.log("=====");

    for (let i = 0; i < 5; i++) {
        let start = performance.now();
        const minItems = [...items];
        minItems.sort((a, b) => a - b);
        minItems.length = 1000;
        let stop = performance.now();
        console.log(stop - start);
    }
}

main();
