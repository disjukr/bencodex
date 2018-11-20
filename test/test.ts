import * as fs from 'fs';
import * as path from 'path';

import { encode, decode } from '../src';

const testsuiteDir = path.resolve(__dirname, 'bencodex/testsuite');

const testsuite = [...new Set(
    fs.readdirSync(testsuiteDir)
        .map(filename => filename.replace(/\..*$/, ''))
)];

for (const testcase of testsuite) {
    const dat = fs.readFileSync(path.resolve(testsuiteDir, `${testcase}.dat`));
    // const yaml = loadYaml(fs.readFileSync(path.resolve(testsuiteDir, `${testcase}.yaml`), 'utf8'));
    // console.log(testcase, dat, yaml);
}
