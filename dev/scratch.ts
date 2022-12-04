

async function main() {
    const iter = (async function *(){
        yield Promise.resolve(1);
        yield Promise.resolve(2);
        yield Promise.resolve(3);
    })();

    for await(const i of iter){
        console.log(i);
    }
}
main();
