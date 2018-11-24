import * as fs from 'fs';
import * as path from 'path';
import { ok } from 'assert';

import { encode, decode, BencodexValue } from '../src';

const testsuiteDir = path.resolve(__dirname, 'bencodex/testsuite');

const testsuite = [...new Set(
    fs.readdirSync(testsuiteDir)
        .map(filename => filename.replace(/\..*$/, ''))
)];

for (const testcase of testsuite) {
    const dat = fs.readFileSync(path.resolve(testsuiteDir, `${testcase}.dat`));
    const obj = jsonToObj(JSON.parse(fs.readFileSync(path.resolve(testsuiteDir, `${testcase}.json`), 'utf8')));
    console.log('--', testcase, '--');
    const encodeResult = encode(obj).equals(dat);
    const decodeResult = eq(decode(dat)!, obj);
    console.log('encode:', encodeResult ? 'ok' : 'fail');
    console.log('decode:', decodeResult ? 'ok' : 'fail');
    ok(encodeResult && decodeResult, testcase);
}

function eq(a: BencodexValue, b: BencodexValue): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a instanceof Buffer && b instanceof Buffer) return a.equals(b);
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; ++i) if (!eq(a[i], b[i])) return false;
        return true;
    }
    if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        const aa = [...a];
        const bb = [...b];
        for (let i = 0; i < a.size; ++i) {
            if (!eq(aa[i][0], bb[i][0])) return false;
            if (!eq(aa[i][1], bb[i][1])) return false;
        }
        return true;
    }
    return false;
}

type JsonObject =
    { type: 'null' } |
    { type: 'boolean', value: boolean } |
    { type: 'integer', decimal: string } |
    { type: 'binary', base64: string } |
    { type: 'text', value: string } |
    { type: 'list', values: JsonObject[] } |
    { type: 'dictionary', pairs: { key: JsonObject, value: JsonObject }[] };
function jsonToObj(jsonObj: JsonObject): BencodexValue {
    switch (jsonObj.type) {
        case 'null': return null;
        case 'boolean': return jsonObj.value;
        case 'integer': return BigInt(jsonObj.decimal);
        case 'binary': return Buffer.from(jsonObj.base64, 'base64');
        case 'text': return jsonObj.value;
        case 'list': return jsonObj.values.map(jsonToObj);
        case 'dictionary':
            return new Map(
                jsonObj.pairs.map(
                    ({ key, value }) => [
                        jsonToObj(key),
                        jsonToObj(value),
                    ] as [string | Buffer, BencodexValue]
                )
            );
    }
}
