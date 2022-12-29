import AsyncJStream from "../src/AsyncJstream";
import Jstream from "../src/Jstream";

async function main() {
    console.log(
        await AsyncJStream.from([1, 2, 3, Promise.resolve(4)] as const).fold(
            Promise.resolve(9),
            (a, b) => a + b,
            (r, c) => r / c
        )
    );

    const testtest = Jstream.of(undefined, 3, undefined, 4, 7, undefined, null, 7, undefined, 8, null).defined().nonNull()
}
main();
