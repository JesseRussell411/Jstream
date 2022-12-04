import AsyncJStream from "../src/AsyncJstream";

async function main() {
    console.log(
        await AsyncJStream.from([1, 2, 3, Promise.resolve(4)] as const).fold(
            Promise.resolve(9),
            (a, b) => a + b,
            (r, c) => r / c
        )
    );
    console.log(
        await AsyncJStream.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).shuffle().toArray()
    );
}
main();
