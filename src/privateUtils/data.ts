/**
 * In-place Fisher-Yates shuffle of the given array.
 */
export function fisherYatesShuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.trunc(Math.random() * (i + 1));

        const temp = array[i]!;
        array[i] = array[j]!;
        array[j] = temp;
    }
}
