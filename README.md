# bencodex

```sh
npm install bencodex
```

```js
const { encode, decode } = require('bencodex');

console.log(encode({ a: 1, b: 2 }));
// => <Buffer 64 75 31 3a 61 69 31 65 75 31 3a 62 69 32 65 65>

console.log(encode({ a: 1, b: 2 }).toString());
// => du1:ai1eu1:bi2ee

console.log(decode(Buffer.from('du1:ai1eu1:bi2ee')));
// => Map { 'a' => 1n, 'b' => 2n }
```
