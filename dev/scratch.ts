async function* foo(){
    yield 1;
    yield 2;
}

async function*  bar(){
    yield 0;
    yield * foo();
    yield 3;
}

async function main(){
    for await (const v of bar()){
        console.log(v);
    }
}
main();

