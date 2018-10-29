function encode(data) {
    return Buffer.concat([encodeAny(data)].flat(Infinity));
};

const $sep = Buffer.from(':');
const $end = Buffer.from('e');
const $null = Buffer.from('n');
const $true = Buffer.from('t');
const $false = Buffer.from('f');
const $int = Buffer.from('i');
const $ustring = Buffer.from('u');
const $list = Buffer.from('l');
const $dict = Buffer.from('d');
const encodeAny = data => {
    if (data == null) return encodeNull();
    switch (typeof data) {
    case 'boolean': return encodeBoolean(data);
    case 'bigint': return encodeInteger(data);
    case 'number': return encodeInteger(data | 0);
    case 'string': return encodeUnicodeString(data);
    }
    if (data instanceof Buffer) return encodeByteString(data);
    if (data instanceof ArrayBuffer) return encodeByteString(Buffer.from(data));
    if (Array.isArray(data)) return encodeList(data);
    if (data instanceof Map) return encodeDict(data);
    return encodeDict(new Map(Object.entries(data)));
};
const encodeNull = _ => $null;
const encodeBoolean = data => data ? $true : $false;
const encodeByteString = data => [Buffer.from(`${ data.length }`), $sep, data];
const encodeUnicodeString = data => {
    const utf8 = Buffer.from(data);
    return [$ustring, Buffer.from(`${ utf8.length }`), $sep, utf8];
};
const encodeInteger = data => [$int, Buffer.from(`${ data }`), $end];
const encodeList = data => [$list, data.map(item => encodeAny(item)), $end];
const encodeDict = data => [
    $dict,
    [...data.keys()].sort(compareDictKey).map(
        key => [
            typeof key === 'string' ? encodeUnicodeString(key) : encodeByteString(key),
            encodeAny(data.get(key)),
        ],
    ),
    $end,
];
const compareDictKey = (a, b) => 
    (typeof a === 'string') ?
    ((typeof b === 'string') ? compareUnicodeStringAsCodePoint(a, b) : 1) :
    (typeof b === 'string') ? -1 : Buffer.compare(a, b);
const compareUnicodeStringAsCodePoint = (a, b) => {
    const iterB = b[Symbol.iterator]();
    for (const charA of a) {
        const { value: charB } = iterB.next();
        if (charB === void 0) return 1;
        const diff = charA.codePointAt() - charB.codePointAt();
        if (diff) return diff;
    }
    const { value: charB } = iterB.next();
    if (charB !== void 0) return -1;
    return 0;
};

function decode(data) {
    return decodeAny(data, 0)[0];
}

const $$sep = ':'.charCodeAt();
const $$end = 'e'.charCodeAt();
const $$null = 'n'.charCodeAt();
const $$true = 't'.charCodeAt();
const $$false = 'f'.charCodeAt();
const $$int = 'i'.charCodeAt();
const $$ustring = 'u'.charCodeAt();
const $$list = 'l'.charCodeAt();
const $$dict = 'd'.charCodeAt();
const decodeAny = (data, offset) => {
    for (const decode of decodeFns) {
        const [value, nextOffset] = decode(data, offset);
        if (nextOffset) return [value, nextOffset];
    }
    return [undefined, 0];
};
const decodeString = (data, offset) => {
    {
        const [value, nextOffset] = decodeByteString(data, offset);
        if (nextOffset) return [value, nextOffset];
    }
    {
        const [value, nextOffset] = decodeUnicodeString(data, offset);
        if (nextOffset) return [value, nextOffset];
    }
    return [null, 0];
};
const decodeNull = (data, offset) =>
    data.readUInt8(offset) === $$null ?
    [null, offset + 1] :
    [null, 0];
const decodeBoolean = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code === $$true) return [true, offset + 1];
    if (code === $$false) return [false, offset + 1];
    return [false, 0];
};
const decodeByteString = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code < 0x30 || code > 0x39) return [null, 0];
    const sepOffset = data.indexOf($$sep, offset);
    const length = data.toString('ascii', offset, sepOffset) | 0;
    const start = sepOffset + 1;
    const end = start + length;
    return [data.slice(start, end), end];
};
const decodeUnicodeString = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$ustring) return ['', 0];
    const sepOffset = data.indexOf($$sep, offset);
    const length = data.toString('ascii', offset + 1, sepOffset) | 0;
    const start = sepOffset + 1;
    const end = start + length;
    return [data.toString('utf8', start, end), end];
};
const decodeInteger = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$int) return [BigInt('0'), 0];
    const endOffset = data.indexOf($$end, offset);
    return [BigInt(data.toString('ascii', offset + 1, endOffset)), endOffset + 1];
};
const decodeList = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$list) return [null, 0];
    offset += 1;
    const result = [];
    while (true) {
        const code = data.readUInt8(offset);
        if (code === $$end) return [result, offset + 1];
        let value;
        [value, offset] = decodeAny(data, offset);
        result.push(value);
    }
};
const decodeDict = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$dict) return [null, 0];
    offset += 1;
    const result = [];
    while (true) {
        const code = data.readUInt8(offset);
        if (code === $$end) return [new Map(result), offset + 1];
        let key, value;
        [key, offset] = decodeString(data, offset);
        [value, offset] = decodeAny(data, offset);
        result.push([key, value]);
    }
};
const decodeFns = [
    decodeNull,
    decodeBoolean,
    decodeByteString,
    decodeUnicodeString,
    decodeInteger,
    decodeList,
    decodeDict,
];

Object.assign(exports, {
    encode,
    decode,
});
