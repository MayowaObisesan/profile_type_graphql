/* Copied from https://stackoverflow.com/posts/43020177/revisions */
export default function randPassword(letters: number, numbers: number, either: number): string {
    const chars: string[] = [
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", // letters
        "0123456789", // numbers
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" // either
    ];

    function randInt(this_max: number): number { // return int between 0 and this_max - 1
        const umax: number = Math.pow(2, 32);
        const max: number = umax - (umax % this_max);
        const r: Uint32Array = new Uint32Array(1);
        do {
            crypto.getRandomValues(r);
        } while (r[0] > max);
        return r[0] % this_max;
    }

    function randCharFrom(chars: string): string {
        return chars[randInt(chars.length)];
    }

    function shuffle<T>(arr: T[]): T[] { // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm
        for (let i = 0, n = arr.length; i < n - 2; i++) {
            const j: number = randInt(n - i);
            [arr[j], arr[i]] = [arr[i], arr[j]];
        }
        return arr;
    }

    return shuffle([letters, numbers, either].map(function (len, i) {
        return Array(len).fill(chars[i]).map(x => randCharFrom(x as string)).join('');
    }).concat().join('').split('')).join('');
}
