import Jstream from "../src/Jstream";

async function main() {
    console.log(
        Jstream.from([1, 2, 3, 4] as const).fold(
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

    console.log(Jstream.from([1,2,3, [4,5,6,[7,8,9]]] as const).flat().flat().toArray());

    console.log(JSON.stringify(Jstream.of(1,2,3)))
    console.log(Jstream.from("the quick brown fox jumps over the lazy dog").toString());
}
main();
