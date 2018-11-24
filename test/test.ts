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
    const val = astToVal(JSON.parse(fs.readFileSync(path.resolve(testsuiteDir, `${testcase}.json`), 'utf8')));
    console.log('--', testcase, '--');
    const encodeResult = encode(val).equals(dat);
    const decodeResult = eq(decode(dat)!, val);
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

type BencodexAstNode =
    { type: 'null' } |
    { type: 'boolean', value: boolean } |
    { type: 'integer', decimal: string } |
    { type: 'binary', base64: string } |
    { type: 'text', value: string } |
    { type: 'list', values: BencodexAstNode[] } |
    { type: 'dictionary', pairs: { key: BencodexAstNode, value: BencodexAstNode }[] };
function astToVal(astNode: BencodexAstNode): BencodexValue {
    switch (astNode.type) {
        case 'null': return null;
        case 'boolean': return astNode.value;
        case 'integer': return BigInt(astNode.decimal);
        case 'binary': return Buffer.from(astNode.base64, 'base64');
        case 'text': return astNode.value;
        case 'list': return astNode.values.map(astToVal);
        case 'dictionary':
            return new Map(
                astNode.pairs.map(
                    ({ key, value }) => [
                        astToVal(key),
                        astToVal(value),
                    ] as [string | Buffer, BencodexValue]
                )
            );
    }
}
