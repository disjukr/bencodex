export type BencodexValue = null | boolean | bigint | string | Buffer | BencodexDict | BencodexList;
export interface BencodexDict extends Map<string | Buffer, BencodexValue> {}
export interface BencodexList extends Array<BencodexValue> {}

export type Encodable = BencodexValue | undefined | number | ArrayBuffer | EncodableDict | EncodableObject | EncodableArray;
export interface EncodableDict extends Map<string | Buffer, Encodable> {}
export interface EncodableObject { [key: string]: Encodable; }
export interface EncodableArray extends Array<Encodable> {}

type EncodeResult = Buffer | EncodeResultArray;
interface EncodeResultArray extends Array<EncodeResult> {}

type DecodeResult<TSucc, TFail = TSucc> = [TFail, 0] | [TSucc, number];
interface DecodeFunction<TSucc, TFail = TSucc> { (data: Buffer, offset: number): DecodeResult<TSucc, TFail>; }

export function encode(data: Encodable): Buffer {
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
const encodeAny = (data: Encodable): EncodeResult => {
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
const encodeNull = () => $null;
const encodeBoolean = (data: boolean) => data ? $true : $false;
const encodeByteString = (data: Buffer) => [Buffer.from(`${ data.length }`), $sep, data];
const encodeUnicodeString = (data: string) => {
    const utf8 = Buffer.from(data);
    return [$ustring, Buffer.from(`${ utf8.length }`), $sep, utf8];
};
const encodeInteger = (data: number | bigint) => [$int, Buffer.from(`${ data }`), $end];
const encodeList = (data: EncodableArray) => [$list, data.map(item => encodeAny(item)), $end];
const encodeDict = (data: EncodableDict) => [
    $dict,
    [...data.keys()].sort(compareDictKey).map(
        key => [
            typeof key === 'string' ? encodeUnicodeString(key) : encodeByteString(key),
            encodeAny(data.get(key)),
        ],
    ),
    $end,
];
const compareDictKey = (a: string | Buffer, b: string | Buffer) =>
    (typeof a === 'string') ?
    ((typeof b === 'string') ? compareUnicodeStringAsCodePoint(a, b) : 1) :
    (typeof b === 'string') ? -1 : Buffer.compare(a, b);
const compareUnicodeStringAsCodePoint = (a: string, b: string) => {
    const iterB = b[Symbol.iterator]();
    for (const charA of a) {
        const { value: charB } = iterB.next();
        if (charB === void 0) return 1;
        const diff = charA.codePointAt(0)! - charB.codePointAt(0)!;
        if (diff) return diff;
    }
    const { value: charB } = iterB.next();
    if (charB !== void 0) return -1;
    return 0;
};

export function decode(data: Buffer): BencodexValue | undefined {
    return decodeAny(data, 0)[0];
}

const $$sep = ':'.charCodeAt(0);
const $$end = 'e'.charCodeAt(0);
const $$null = 'n'.charCodeAt(0);
const $$true = 't'.charCodeAt(0);
const $$false = 'f'.charCodeAt(0);
const $$int = 'i'.charCodeAt(0);
const $$ustring = 'u'.charCodeAt(0);
const $$list = 'l'.charCodeAt(0);
const $$dict = 'd'.charCodeAt(0);
const decodeAny: DecodeFunction<BencodexValue | undefined> = (data, offset) => {
    for (const decode of decodeFns) {
        const [value, nextOffset] = decode(data, offset);
        if (nextOffset) return [value, nextOffset];
    }
    return [undefined, 0];
};
const decodeString: DecodeFunction<string | Buffer, null> = (data, offset) => {
    {
        const [value, nextOffset] = decodeByteString(data, offset);
        if (nextOffset) return [value!, nextOffset];
    }
    {
        const [value, nextOffset] = decodeUnicodeString(data, offset);
        if (nextOffset) return [value, nextOffset];
    }
    return [null, 0];
};
const decodeNull: DecodeFunction<null> = (data, offset) =>
    data.readUInt8(offset) === $$null ?
    [null, offset + 1] :
    [null, 0];
const decodeBoolean: DecodeFunction<boolean> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code === $$true) return [true, offset + 1];
    if (code === $$false) return [false, offset + 1];
    return [false, 0];
};
const decodeByteString: DecodeFunction<Buffer, null> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code < 0x30 || code > 0x39) return [null, 0];
    const sepOffset = data.indexOf($$sep, offset);
    const length = +data.toString('ascii', offset, sepOffset);
    const start = sepOffset + 1;
    const end = start + length;
    return [data.slice(start, end), end];
};
const decodeUnicodeString: DecodeFunction<string> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$ustring) return ['', 0];
    const sepOffset = data.indexOf($$sep, offset);
    const length = +data.toString('ascii', offset + 1, sepOffset);
    const start = sepOffset + 1;
    const end = start + length;
    return [data.toString('utf8', start, end), end];
};
const decodeInteger: DecodeFunction<bigint> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$int) return [BigInt('0'), 0];
    const endOffset = data.indexOf($$end, offset);
    return [BigInt(data.toString('ascii', offset + 1, endOffset)), endOffset + 1];
};
const decodeList: DecodeFunction<BencodexList, null> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$list) return [null, 0];
    offset += 1;
    const result: BencodexList = [];
    while (true) {
        const code = data.readUInt8(offset);
        if (code === $$end) return [result, offset + 1];
        let value;
        [value, offset] = decodeAny(data, offset);
        result.push(value!);
    }
};
const decodeDict: DecodeFunction<BencodexDict, null> = (data, offset) => {
    const code = data.readUInt8(offset);
    if (code !== $$dict) return [null, 0];
    offset += 1;
    const result = [] as any;
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
